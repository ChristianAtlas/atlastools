## Goal

Rebuild the AtlasOne Invoicing & Billing Engine into a clean, accurate, fully-categorized PEO billing system with two invoice types (Payroll + Monthly Service), Stripe-powered payments (autopay + manual), a modern client experience, and a super admin operations console. We extend the existing `invoices` / `invoice_line_items` schema rather than discard it — it already supports payroll/monthly types, line items, AR balances, NSF events, payment attempts, and billing profiles.

---

## Scope summary

1. Rebuild **payroll invoice generator** to produce 5 fully-categorized sections from real `payroll_run_employee_*` data.
2. Rebuild **monthly invoice generator** to match exact pricing rules (flat $65 + plan + add-ons + catch-up).
3. Add **payments**: Stripe Checkout for manual pay, Stripe ACH/Card autopay, retry, NSF handling, payment_methods table.
4. Build a **modern client invoice viewer** (expandable categorized sections, tooltips, Pay Now, autopay toggle, PDF download).
5. Build a **super admin billing console** (cross-client invoices, adjustments, recalc, AR aging, revenue reports).
6. Add **automation hooks**: invoice on payroll approval, cron on the 1st, autocharge after generation, retry failed.

---

## Data model changes

Most tables already exist. Additions only:

- `invoice_line_items`: add `category text` (`gross_pay` | `employee_taxes` | `employee_deductions` | `employer_taxes` | `employer_benefits` | `service_fee` | `addon` | `catch_up` | `markup_internal`) and `is_internal boolean default false`. Keep `is_markup` for back-compat.
- New table `invoice_adjustments`: `id, invoice_id, type (credit|debit|writeoff), amount_cents, reason, created_by, created_at`.
- New table `payment_methods`: `id, company_id, stripe_payment_method_id, type (card|ach), last4, brand, is_default, autopay_enabled, status, created_at`.
- New table `billing_activity_logs`: append-only event log `id, company_id, invoice_id, event_type, payload jsonb, actor, created_at`.
- `billing_profiles`: add `autopay_enabled boolean default false`, `stripe_customer_id text`.
- `monthly_employee_billing` already covers per-employee ledger; reuse.

All new tables get RLS: super_admin full access; client_admin read where `company_id = get_user_company(auth.uid())`.

---

## Payroll Invoice rebuild (`generate-payroll-invoice`)

Triggered by `useGeneratePayrollInvoice` when payroll moves to `client_approved` / `auto_approved`.

For each `payroll_run_employee` join `payroll_run_employee_earnings/_taxes/_deductions/_contributions`, plus `vendor_payments` for the same period, and aggregate into:

```text
1. Total Payments (gross funding requirement, informational subtotal)
   - W-2 wages (sum of earnings.amount_cents)
   - 1099 vendor payments (sum from vendor_payments in pay period)

2. Employee Tax Withholdings  (informational; NOT added to invoice total)
   - Federal income, SS-EE, Medicare-EE, Add'l Medicare, State income, Local

3. Employee Deductions  (informational; NOT added)
   - 401(k), Medical, Dental, Vision, FSAs, Other (from deductions table)

4. Employer Tax Contributions  (BILLED)
   - FUTA, SS-ER, Medicare-ER
   - SUI: if state is PEO-reporting → bill rate × 1.025 (invisible 2.5% markup)
          if state is client-reporting → bill exact amount, no markup
   - Other state employer taxes

5. Employer Benefit Contributions  (BILLED)
   - Workers' Comp: bill rate × 1.015 (invisible 1.5% markup, per existing WC engine)
   - Employer 401(k) match
   - Employer-paid health, etc. (from contributions table)
```

**Total billed = Section 1 (Total Payments) + Section 4 (Employer Taxes w/ SUI markup) + Section 5 (Employer Benefits w/ WC markup).**

Sections 2 & 3 are stored as `is_internal=false` line items with `category='employee_taxes'`/`'employee_deductions'` so the client can see what was withheld, but flagged with `included_in_total=false` (new column) to exclude from sum. Markups stored as `category='markup_internal'`, `is_internal=true`.

PEO vs client SUI reporting state determined from existing SUI rate config (already used elsewhere — reuse helper).

Status set to `due_immediately`, `due_date = pay_date`. Triggers autopay if enabled.

---

## Monthly Service Invoice rebuild (`generate-monthly-invoices`)

Run monthly via pg_cron on the 1st at 06:00 UTC. Per active company:

```text
1. Flat Monthly Fee — $65 (always)
2. PEO Plan Charge — plan rate × employees paid in prior month
   (count distinct employee_id from payroll_run_employees with status='processed'
    and pay_date in prior month)
3. Time Tracking — $8 × employees with punches OR PTO entries last month
4. Contractors — $39 × distinct vendors paid last month
5. HR Consulting — $30 × eligible employees if addon active
6. Catch-up — for any employee active last month not in `monthly_employee_billing`
```

Each line gets `category='service_fee' | 'addon' | 'catch_up'`. Idempotent on `(company_id, period_start)`. Updates `monthly_employee_billing` ledger.

pg_cron schedule (via supabase insert tool, not migration):
```sql
select cron.schedule('generate-monthly-invoices', '0 6 1 * *',
  $$ select net.http_post(url:='<project>/functions/v1/generate-monthly-invoices', headers:='{...}'::jsonb, body:='{}'::jsonb); $$);
```

---

## Payments

**Stripe Checkout** for manual Pay Now (one-off `mode: payment`, success → mark invoice paid via webhook).

**Autopay**: when invoice is created with `due_date = today` (payroll) or generation completes (monthly), if billing_profile.autopay_enabled and a default `payment_method` exists, edge function `charge-invoice-autopay` calls `stripe.paymentIntents.create({ confirm: true, off_session: true, payment_method })`. On success → `paid`. On failure → status `failed_payment`, create `nsf_events` row, schedule retry (existing infra).

**Edge functions to add/replace:**
- `create-invoice-checkout` — manual Pay Now → Stripe Checkout URL
- `charge-invoice-autopay` — off-session autopay charge
- `stripe-payment-webhook` — handles `checkout.session.completed`, `payment_intent.succeeded/failed`; updates invoice + payment_attempts + nsf_events
- `setup-payment-method` — Stripe SetupIntent for client to add card/ACH; saves to `payment_methods`

Webhook secret needed: will request `STRIPE_WEBHOOK_SECRET` via secrets tool.

---

## Client UI rebuild

New page `src/pages/ClientInvoices.tsx` (replace client-side of existing `/invoices` for client_admin/employee).

**Layout:**
- Top KPIs: Outstanding Balance, Next Due, Autopay status, Last Payment
- Wire instructions card (existing, kept)
- Payment Methods card with "Add card / bank" (Stripe SetupIntent) + autopay toggle
- Invoice list (search, filter by type/status/date)

**Invoice Detail (`ClientInvoiceDetail.tsx`):**
- Modern header: invoice #, status pill, total, due date, big Pay Now button
- 5 collapsible sections (Total Payments / Employee Withholdings / Employee Deductions / Employer Taxes / Employer Benefits) each showing summed total + expandable per-category breakdown
- Sections marked "informational" for #2/#3 (not added to total)
- Tooltips on each category explaining what it covers
- Footer: Total Billed (large), Pay Now / View Receipt, Download PDF
- Internal markup lines never rendered for clients (filter `is_internal=true`)

**PDF generation**: edge function `render-invoice-pdf` using `pdf-lib` (deno-compatible) producing branded PDF; store in `invoice-pdfs` Storage bucket; signed URL on download.

---

## Super Admin UI rebuild

Existing `Invoices.tsx` becomes the super admin console with new tabs:
- **All Invoices** (current table, enhanced filters: AR aging buckets 0-30/31-60/61-90/90+)
- **Adjustments** — list + dialog to create credit/debit/write-off (writes to `invoice_adjustments`, recalculates `balance_due_cents`, audit log entry)
- **Recalculate** — button on payroll invoice to re-run `generate-payroll-invoice` after a payroll correction (voids old, creates v2 with `parent_invoice_id`)
- **Failed Payments** (existing NSF tab, enhanced)
- **Reports** — new tab with charts: Revenue by client, Revenue by type (payroll vs monthly vs addons), MRR trend, Outstanding by aging bucket, Payment success rate, Contractor revenue, Add-on revenue. Built with existing `recharts` (already in repo).

---

## Automation triggers

1. **On payroll approval** — `usePayrollRuns` mutation that sets status to `client_approved` / `auto_approved` chains `useGeneratePayrollInvoice` (already wired in `PayrollDetail.tsx`; just verify path).
2. **Monthly cron** — pg_cron job above.
3. **Autopay after generation** — both generators end by invoking `charge-invoice-autopay` if eligible.
4. **Retry** — pg_cron daily that scans `nsf_events` with `retry_eligible=true` and `retry_count<3`, re-invokes autopay.
5. **Notifications** — use existing email infra (Lovable Email already set up via `send-transactional-email` if domain configured; otherwise enqueue to `email_send_log`). Templates: invoice_generated, payment_succeeded, payment_failed.

---

## Files to add / change

**New edge functions**
- `supabase/functions/charge-invoice-autopay/index.ts`
- `supabase/functions/create-invoice-checkout/index.ts`
- `supabase/functions/setup-payment-method/index.ts`
- `supabase/functions/stripe-payment-webhook/index.ts`
- `supabase/functions/render-invoice-pdf/index.ts`
- `supabase/functions/retry-failed-payments/index.ts` (cron)

**Rewritten edge functions**
- `supabase/functions/generate-payroll-invoice/index.ts` (full 5-section breakdown)
- `supabase/functions/generate-monthly-invoices/index.ts` (exact pricing rules + correct counting)

**New pages / components**
- `src/pages/ClientInvoices.tsx`
- `src/pages/ClientInvoiceDetail.tsx`
- `src/components/billing/InvoiceSectionCard.tsx`
- `src/components/billing/PaymentMethodsCard.tsx`
- `src/components/billing/AutopayToggle.tsx`
- `src/components/billing/AdjustmentDialog.tsx`
- `src/components/billing/RevenueReports.tsx`

**Updated**
- `src/pages/Invoices.tsx` (super admin: add Adjustments, Reports tabs)
- `src/hooks/useInvoices.ts` (add adjustments, payment_methods, autopay, checkout hooks)
- `src/App.tsx` (route `/my-invoices` for client/employee)
- `src/components/AppSidebar.tsx` (route swap by role)

**Migrations**
- Add `category`, `is_internal`, `included_in_total` to `invoice_line_items`
- Create `invoice_adjustments`, `payment_methods`, `billing_activity_logs`
- Add `autopay_enabled`, `stripe_customer_id` to `billing_profiles`
- RLS policies on all new tables

**Insert (not migration)**
- pg_cron schedules for monthly invoices + retry job

**Secrets**
- Request `STRIPE_WEBHOOK_SECRET` from user before deploying webhook

---

## Out of scope for this iteration

- Email template visual redesign (use existing transactional template wrapper)
- Multi-currency
- Subscription mode in Stripe (using one-off charges + custom autopay logic — simpler and matches PEO billing rhythm)

---

Approve and I'll execute in this order: migrations → rebuild generators → payments + webhook → client UI → super admin UI → cron + automation.
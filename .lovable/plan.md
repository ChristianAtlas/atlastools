
This is a massive Phase 2 refactor. Before writing 1500+ lines of SQL and rewriting ~40 frontend files, I need to confirm scope and data-handling decisions. Below is my recommended plan; I've flagged 3 decisions you must confirm before implementation.

## Current State (already in your DB)

You already have many of these tables — we should **extend, not duplicate**:
- `employees`, `employment_records`, `compensation_records`
- `payroll_runs`, `payroll_run_employees`
- `client_sui_rates`, `peo_sui_rates`, `sui_adjustments`
- `employee_wc_assignments`, `billing_profiles`
- `audit_logs`, `earning_deduction_types` (60+ types)
- `invoices`, `invoice_line_items`

## Recommended Approach: Two-Phase Rollout

### Phase 2A — Additive (Safe, No Breakage)

**New tables:**
- `pay_groups`, `pay_schedules` (replace ad-hoc `payroll_schedules`)
- `payroll_run_employee_earnings` / `_deductions` / `_taxes` / `_contributions` (the missing detail breakdown)
- `wc_policies`, `wc_codes`, `wc_code_rates` (formalize WC structure)
- `company_tax_accounts` (multi-state SUI/SIT registration)
- `company_locations`, `employee_addresses` (multi-state work/resident)
- `employee_deductions`, `employee_direct_deposits` (encrypted)

**Column extensions on existing tables:**
- `employment_records` → add `worker_type`, `employee_type`, `flsa_status`, `work_state`, `resident_state`, `location_id`, `pay_group_id`, `benefit_eligibility_class`, `original_hire_date`, `rehire_date`
- `compensation_records` → add `standard_hours`, `overtime_eligible`
- `invoices` → add `invoice_type`, `billing_period_start/end`, `issued_at`
- `invoice_line_items` → add `line_type`, `reference_type`, `reference_id`, `payroll_run_employee_id`

**Constraints:**
- Partial unique indexes for "one active X" rules (employment, SUI rate, WC assignment)
- RLS policies on every new table mirroring existing `sa_all_*` / `ca_read_own_*` pattern

**Frontend impact:** None. Existing UI keeps working. New tables wired up incrementally.

### Phase 2B — Re-Anchoring (Breaking, Deferred)

Re-point `payroll_run_employees`, `compensation_records`, `employee_wc_assignments` from `employee_id` → `employment_record_id`. This requires rewriting ~40 hooks/pages/edge functions and is best done as a separate effort.

## Decisions I Need From You

**1. Scope** — pick one:
- **(A) Phase 2A only** (recommended) — additive schema + ERD + RLS, zero frontend breakage
- **(B) Full Phase 2** — additive + re-anchor + rewrite ~40 frontend files (multi-day effort)
- **(C) Schema-only** — SQL + ERD + RLS, you handle frontend

**2. Existing data** — pick one:
- **(A) Backfill** — auto-create one `employment_record` per existing employee, preserve all history
- **(B) Wipe demo, keep prod** — drop `is_demo=true` rows, backfill production only
- **(C) Fresh start** — truncate (only safe if no real client data)

**3. Earnings/Deductions** — pick one:
- **(A) Reuse existing `earning_deduction_types`** (recommended) — reference it from new breakdown tables, preserve 60+ configured types
- **(B) Split into separate `earning_types` + `deduction_types`** per spec, deprecate the old table

## Deliverables (after you confirm)

1. Migration SQL (one file per logical group: pay_groups, payroll_detail, wc, tax, locations, billing, audit)
2. Updated ERD (`Schema_Diagram_v2.mmd`)
3. RLS policies for every new table
4. Referential integrity validation queries
5. (If scope B) Updated hooks, pages, edge functions

## My Recommendations

- **Scope A** (Phase 2A only) — get the schema solid first, refactor UI in a separate, focused effort
- **Backfill** existing data — preserves audit trail
- **Reuse `earning_deduction_types`** — your existing config is more sophisticated than the spec suggests

Reply with your three choices (e.g., "A, A, A") and I'll generate the migrations.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: unknown) =>
  console.log(`[MONTHLY-INVOICE] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json().catch(() => ({}));
    const billingMonth = body.billing_month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const billingDate = `${billingMonth}-01`;
    const targetCompanyId = body.company_id; // optional: generate for specific company only

    log("Starting monthly invoice generation", { billingMonth, targetCompanyId });

    // Get all active companies
    let companiesQuery = supabase
      .from("companies")
      .select("id, name, employee_count")
      .eq("status", "active")
      .is("deleted_at", null);

    if (targetCompanyId) {
      companiesQuery = companiesQuery.eq("id", targetCompanyId);
    }

    const { data: companies, error: compErr } = await companiesQuery;
    if (compErr) throw compErr;
    if (!companies?.length) {
      return new Response(JSON.stringify({ message: "No active companies found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
      });
    }

    const results: Array<{ company_id: string; invoice_id: string; total_cents: number }> = [];

    for (const company of companies) {
      // Check if monthly invoice already exists for this company/month
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("company_id", company.id)
        .eq("invoice_type", "monthly")
        .eq("period_start", billingDate)
        .maybeSingle();

      if (existing) {
        log("Invoice already exists, skipping", { company_id: company.id });
        continue;
      }

      // Get active employees for this company
      const { data: employees } = await supabase
        .from("employees")
        .select("id, first_name, last_name, pay_type, start_date")
        .eq("company_id", company.id)
        .eq("status", "active")
        .is("deleted_at", null);

      const empCount = employees?.length || 0;
      if (empCount === 0) {
        log("No active employees, skipping", { company_id: company.id });
        continue;
      }

      // Get company plan
      const { data: plan } = await supabase
        .from("company_plans")
        .select("*, pricing_tiers(*)")
        .eq("company_id", company.id)
        .eq("status", "active")
        .maybeSingle();

      // Get billing profile
      const { data: billingProfile } = await supabase
        .from("billing_profiles")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

      const lineItems: Array<{
        description: string;
        tier_slug: string | null;
        quantity: number;
        unit_price_cents: number;
        total_cents: number;
        is_markup: boolean;
      }> = [];

      // A. Tier / Employee Charge
      if (plan?.pricing_tiers) {
        const tier = plan.pricing_tiers;
        const qty = tier.per_employee ? empCount : 1;
        lineItems.push({
          description: `${tier.name} × ${qty} ${tier.per_employee ? "employees" : ""}`,
          tier_slug: tier.slug,
          quantity: qty,
          unit_price_cents: tier.unit_price_cents,
          total_cents: tier.unit_price_cents * qty,
          is_markup: false,
        });
      }

      // B. Monthly Service Charge
      const serviceChargeCents = billingProfile?.monthly_service_charge_cents || 6500;
      const { data: serviceTier } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("slug", "monthly_service")
        .maybeSingle();

      const svcCents = serviceTier?.unit_price_cents || serviceChargeCents;
      lineItems.push({
        description: "Monthly Service Charge",
        tier_slug: "monthly_service",
        quantity: 1,
        unit_price_cents: svcCents,
        total_cents: svcCents,
        is_markup: false,
      });

      // C. Add-ons
      if (plan) {
        const { data: addons } = await supabase
          .from("company_addons")
          .select("*, pricing_tiers(*)")
          .eq("company_plan_id", plan.id);

        if (addons) {
          for (const addon of addons) {
            const t = addon.pricing_tiers;
            const qty = t.slug === "contractors"
              ? (plan.contractor_count || 0)
              : (addon.quantity || empCount);
            if (qty > 0) {
              lineItems.push({
                description: `${t.name} × ${qty}`,
                tier_slug: t.slug,
                quantity: qty,
                unit_price_cents: t.unit_price_cents,
                total_cents: t.unit_price_cents * qty,
                is_markup: false,
              });
            }
          }
        }
      }

      // C2. Timekeeping add-on (per-active-employee with time OR PTO entered this billing month)
      const { data: tkSettings } = await supabase
        .from("timekeeping_settings")
        .select("is_enabled")
        .eq("company_id", company.id)
        .maybeSingle();

      if (tkSettings?.is_enabled) {
        const monthStart = billingDate;
        const monthEnd = new Date(new Date(billingDate).getFullYear(), new Date(billingDate).getMonth() + 1, 0)
          .toISOString().slice(0, 10);

        // Active employees who entered time (any punch) this month
        const { data: punchEmps } = await supabase
          .from("tk_punches")
          .select("employee_id")
          .eq("company_id", company.id)
          .eq("voided", false)
          .gte("punched_at", `${monthStart}T00:00:00Z`)
          .lte("punched_at", `${monthEnd}T23:59:59Z`);

        // Active employees who entered PTO this month
        const { data: ptoEmps } = await supabase
          .from("pto_requests")
          .select("employee_id")
          .eq("company_id", company.id)
          .gte("start_date", monthStart)
          .lte("start_date", monthEnd);

        const activeEmpIds = new Set<string>();
        (punchEmps ?? []).forEach((p: any) => p.employee_id && activeEmpIds.add(p.employee_id));
        (ptoEmps ?? []).forEach((p: any) => p.employee_id && activeEmpIds.add(p.employee_id));

        const tkActiveCount = activeEmpIds.size;
        if (tkActiveCount > 0) {
          const { data: tkPricing } = await supabase
            .from("timekeeping_pricing")
            .select("per_employee_cents")
            .order("effective_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          const perEmpCents = tkPricing?.per_employee_cents ?? 800;
          lineItems.push({
            description: `Timekeeping add-on × ${tkActiveCount} active employees`,
            tier_slug: "timekeeping_addon",
            quantity: tkActiveCount,
            unit_price_cents: perEmpCents,
            total_cents: perEmpCents * tkActiveCount,
            is_markup: false,
          });
          log("Added timekeeping line item", { company_id: company.id, count: tkActiveCount, per_emp_cents: perEmpCents });
        }
      }

      // D. Catch-up charges - find employees not billed last month
      // C3. Vendor / 1099 flat monthly fee — only when at least one non-voided
      // vendor payment landed in this billing month for this company.
      const vmStart = billingDate;
      const vmEnd = new Date(new Date(billingDate).getFullYear(), new Date(billingDate).getMonth() + 1, 0)
        .toISOString().slice(0, 10);
      const { data: vendorRunsThisMonth } = await supabase
        .from("vendor_payment_runs")
        .select("id")
        .eq("company_id", company.id)
        .gte("pay_date", vmStart)
        .lte("pay_date", vmEnd)
        .neq("status", "voided");
      const vendorRunIds = (vendorRunsThisMonth ?? []).map((r: any) => r.id);
      let activeVendorPaymentCount = 0;
      if (vendorRunIds.length > 0) {
        const { count } = await supabase
          .from("vendor_payments")
          .select("id", { count: "exact", head: true })
          .in("vendor_payment_run_id", vendorRunIds)
          .neq("status", "voided");
        activeVendorPaymentCount = count ?? 0;
      }
      if (activeVendorPaymentCount > 0) {
        const { data: vendorTier } = await supabase
          .from("pricing_tiers")
          .select("*")
          .eq("slug", "vendor_monthly_fee")
          .maybeSingle();
        const vendorFeeCents = vendorTier?.unit_price_cents ?? 5000; // default $50/mo flat
        lineItems.push({
          description: `Vendor / 1099 monthly fee (${activeVendorPaymentCount} payment${activeVendorPaymentCount === 1 ? '' : 's'} this month)`,
          tier_slug: "vendor_monthly_fee",
          quantity: 1,
          unit_price_cents: vendorFeeCents,
          total_cents: vendorFeeCents,
          is_markup: false,
        });
        log("Added vendor monthly fee", { company_id: company.id, payments: activeVendorPaymentCount });
      }

      const prevMonth = new Date(billingDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStr = prevMonth.toISOString().slice(0, 10);

      const { data: prevBilled } = await supabase
        .from("monthly_employee_billing")
        .select("employee_id")
        .eq("company_id", company.id)
        .eq("billing_month", prevMonthStr)
        .eq("status", "billed");

      const prevBilledIds = new Set((prevBilled || []).map(b => b.employee_id));
      const catchUpEmployees = (employees || []).filter(e => {
        // Only catch up if employee was active last month but not billed
        const startDate = new Date(e.start_date);
        const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
        return startDate <= prevMonthEnd && !prevBilledIds.has(e.id);
      });

      let catchUpCents = 0;
      const catchUpCount = catchUpEmployees.length;

      if (catchUpCount > 0 && plan?.pricing_tiers) {
        const tier = plan.pricing_tiers;
        if (tier.per_employee) {
          catchUpCents = tier.unit_price_cents * catchUpCount;
          lineItems.push({
            description: `Catch-up employee charges (${catchUpCount} employees from prior month)`,
            tier_slug: "catch_up",
            quantity: catchUpCount,
            unit_price_cents: tier.unit_price_cents,
            total_cents: catchUpCents,
            is_markup: false,
          });
        }
      }

      const totalCents = lineItems.reduce((s, li) => s + li.total_cents, 0);

      // Calculate period end (last day of billing month)
      const periodEnd = new Date(
        new Date(billingDate).getFullYear(),
        new Date(billingDate).getMonth() + 1,
        0
      ).toISOString().slice(0, 10);

      // Generate invoice number
      const now = new Date();
      const invoiceNumber = `INV-M-${billingMonth.replace("-", "")}-${company.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      // Insert invoice
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          company_id: company.id,
          company_name: company.name,
          invoice_number: invoiceNumber,
          invoice_type: "monthly",
          period_start: billingDate,
          period_end: periodEnd,
          subtotal_cents: totalCents,
          markup_cents: 0,
          total_cents: totalCents,
          balance_due_cents: totalCents,
          status: "sent",
          due_date: billingDate,
          delivery_status: "sent",
          sent_at: now.toISOString(),
          employee_count: empCount,
          catch_up_count: catchUpCount,
          catch_up_cents: catchUpCents,
        })
        .select()
        .single();

      if (invErr) {
        log("Error creating invoice", { company_id: company.id, error: invErr.message });
        continue;
      }

      // Insert line items
      await supabase
        .from("invoice_line_items")
        .insert(lineItems.map(li => ({ ...li, invoice_id: invoice.id })));

      // Record monthly billing ledger for all current employees
      const billingRecords = (employees || []).map(emp => ({
        employee_id: emp.id,
        company_id: company.id,
        billing_month: billingDate,
        tier_id: plan?.pricing_tiers?.id || null,
        charge_cents: plan?.pricing_tiers?.per_employee ? plan.pricing_tiers.unit_price_cents : 0,
        status: "billed",
        catch_up_needed: false,
        catch_up_billed: false,
        invoice_id: invoice.id,
      }));

      if (billingRecords.length > 0) {
        await supabase.from("monthly_employee_billing").upsert(billingRecords, {
          onConflict: "employee_id,billing_month",
        });
      }

      // Mark catch-up employees as caught up
      if (catchUpCount > 0) {
        for (const emp of catchUpEmployees) {
          await supabase
            .from("monthly_employee_billing")
            .upsert({
              employee_id: emp.id,
              company_id: company.id,
              billing_month: prevMonthStr,
              charge_cents: plan?.pricing_tiers?.per_employee ? plan.pricing_tiers.unit_price_cents : 0,
              status: "billed",
              catch_up_needed: false,
              catch_up_billed: true,
              catch_up_invoice_id: invoice.id,
            }, { onConflict: "employee_id,billing_month" });
        }
      }

      // Update billing profile AR
      if (billingProfile) {
        await supabase
          .from("billing_profiles")
          .update({
            current_ar_balance_cents: (billingProfile.current_ar_balance_cents || 0) + totalCents,
          })
          .eq("id", billingProfile.id);
      }

      results.push({ company_id: company.id, invoice_id: invoice.id, total_cents: totalCents });
      log("Invoice created", { company: company.name, total: totalCents, employees: empCount, catchUp: catchUpCount });
    }

    return new Response(JSON.stringify({ invoices: results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

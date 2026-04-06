import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: unknown) =>
  console.log(`[PAYROLL-INVOICE] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

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
    const { payroll_run_id } = await req.json();
    if (!payroll_run_id) throw new Error("payroll_run_id is required");

    log("Generating payroll invoice", { payroll_run_id });

    // Check if invoice already exists for this payroll run
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("payroll_run_id", payroll_run_id)
      .eq("invoice_type", "payroll")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ invoice_id: existing.id, message: "Invoice already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Get payroll run with company
    const { data: run, error: runErr } = await supabase
      .from("payroll_runs")
      .select("*, companies(name)")
      .eq("id", payroll_run_id)
      .single();

    if (runErr || !run) throw new Error(`Payroll run not found: ${payroll_run_id}`);

    // Get processed employees
    const { data: runEmployees } = await supabase
      .from("payroll_run_employees")
      .select("*")
      .eq("payroll_run_id", payroll_run_id)
      .in("status", ["processed", "pending", "calculated"]);

    const processedCount = runEmployees?.length || 0;

    // Get billing profile for markup rates
    const { data: billingProfile } = await supabase
      .from("billing_profiles")
      .select("*")
      .eq("company_id", run.company_id)
      .maybeSingle();

    const wcMarkupRate = billingProfile?.workers_comp_markup_rate || 0.015;
    const suiMarkupRate = billingProfile?.sui_markup_rate || 0.025;

    // Calculate totals from employee-level data
    let totalGrossCents = 0;
    let totalEmployerTaxCents = 0;
    let totalEmployerBenefitsCents = 0;
    let totalWorkersCompCents = 0;
    let totalEmployerSuiCents = 0;

    for (const emp of (runEmployees || [])) {
      totalGrossCents += Number(emp.gross_pay_cents) || 0;
      totalEmployerTaxCents += (Number(emp.employer_fica_cents) || 0)
        + (Number(emp.employer_futa_cents) || 0)
        + (Number(emp.federal_tax_cents) || 0);
      totalEmployerSuiCents += Number(emp.employer_sui_cents) || 0;
      totalEmployerBenefitsCents += Number(emp.employer_benefits_cents) || 0;
      totalWorkersCompCents += Number(emp.workers_comp_cents) || 0;
    }

    // Fallback to run-level totals if no employee data
    if (totalGrossCents === 0) {
      totalGrossCents = Number(run.gross_pay_cents) || 0;
      totalEmployerTaxCents = Number(run.employer_taxes_cents) || 0;
      totalEmployerBenefitsCents = Number(run.employer_benefits_cents) || 0;
      totalWorkersCompCents = Number(run.workers_comp_cents) || 0;
    }

    // Apply INVISIBLE markups
    // Workers comp: add 1.5% invisible markup
    const wcBaseAmount = totalWorkersCompCents;
    const wcMarkupAmount = Math.round(wcBaseAmount * wcMarkupRate);
    const wcBilledAmount = wcBaseAmount + wcMarkupAmount;

    // SUI: add 2.5% invisible markup
    const suiBaseAmount = totalEmployerSuiCents;
    const suiMarkupAmount = Math.round(suiBaseAmount * suiMarkupRate);
    const suiBilledAmount = suiBaseAmount + suiMarkupAmount;

    // Employer tax total for client = non-SUI taxes + SUI with markup baked in
    const employerTaxBilled = totalEmployerTaxCents + suiBilledAmount;

    // Build line items (client-facing - no separate markup lines)
    const lineItems: Array<{
      description: string;
      tier_slug: string | null;
      quantity: number;
      unit_price_cents: number;
      total_cents: number;
      is_markup: boolean;
      markup_type?: string;
      markup_rate?: number;
    }> = [];

    // A. Employee Gross Pay
    lineItems.push({
      description: `Employee Gross Wages (${processedCount} employees)`,
      tier_slug: "gross_pay",
      quantity: processedCount,
      unit_price_cents: totalGrossCents,
      total_cents: totalGrossCents,
      is_markup: false,
    });

    // B. Employer Tax Liability (SUI markup baked in)
    lineItems.push({
      description: "Employer Tax Liability",
      tier_slug: "employer_taxes",
      quantity: 1,
      unit_price_cents: employerTaxBilled,
      total_cents: employerTaxBilled,
      is_markup: false,
    });

    // C. Employer Benefits Contributions
    if (totalEmployerBenefitsCents > 0) {
      lineItems.push({
        description: "Employer Benefits Contributions",
        tier_slug: "employer_benefits",
        quantity: 1,
        unit_price_cents: totalEmployerBenefitsCents,
        total_cents: totalEmployerBenefitsCents,
        is_markup: false,
      });
    }

    // D. Workers' Compensation (1.5% markup baked in)
    if (wcBilledAmount > 0) {
      lineItems.push({
        description: "Workers' Compensation",
        tier_slug: "workers_comp",
        quantity: 1,
        unit_price_cents: wcBilledAmount,
        total_cents: wcBilledAmount,
        is_markup: false,
      });
    }

    // Internal-only markup tracking lines (hidden from client)
    lineItems.push({
      description: `[Internal] WC Markup (${(wcMarkupRate * 100).toFixed(1)}%)`,
      tier_slug: "wc_markup_internal",
      quantity: 1,
      unit_price_cents: wcMarkupAmount,
      total_cents: wcMarkupAmount,
      is_markup: true,
      markup_type: "workers_comp",
      markup_rate: wcMarkupRate,
    });

    lineItems.push({
      description: `[Internal] SUI Markup (${(suiMarkupRate * 100).toFixed(1)}%)`,
      tier_slug: "sui_markup_internal",
      quantity: 1,
      unit_price_cents: suiMarkupAmount,
      total_cents: suiMarkupAmount,
      is_markup: true,
      markup_type: "sui",
      markup_rate: suiMarkupRate,
    });

    const subtotalCents = lineItems.filter(li => !li.is_markup).reduce((s, li) => s + li.total_cents, 0);
    const markupCents = wcMarkupAmount + suiMarkupAmount;
    // Total shown to client = subtotal (markups already baked into line items)
    const totalCents = subtotalCents;

    const now = new Date();
    const invoiceNumber = `INV-P-${run.pay_date.replace(/-/g, "")}-${run.company_id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        company_id: run.company_id,
        company_name: run.companies?.name || run.company_id,
        invoice_number: invoiceNumber,
        invoice_type: "payroll",
        payroll_run_id: run.id,
        period_start: run.pay_period_start,
        period_end: run.pay_period_end,
        subtotal_cents: subtotalCents,
        markup_cents: markupCents,
        total_cents: totalCents,
        balance_due_cents: totalCents,
        status: "due_immediately",
        due_date: run.pay_date,
        delivery_status: "sent",
        sent_at: now.toISOString(),
        employee_count: processedCount,
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Insert line items
    await supabase
      .from("invoice_line_items")
      .insert(lineItems.map(li => ({ ...li, invoice_id: invoice.id })));

    // Update payroll run invoice_status
    await supabase
      .from("payroll_runs")
      .update({ invoice_status: "generated" })
      .eq("id", payroll_run_id);

    // Update billing profile AR
    if (billingProfile) {
      await supabase
        .from("billing_profiles")
        .update({
          current_ar_balance_cents: (billingProfile.current_ar_balance_cents || 0) + totalCents,
        })
        .eq("id", billingProfile.id);
    }

    log("Payroll invoice created", {
      invoice_id: invoice.id,
      total: totalCents,
      wc_markup: wcMarkupAmount,
      sui_markup: suiMarkupAmount,
    });

    return new Response(JSON.stringify({ invoice, markup_details: { wc_markup: wcMarkupAmount, sui_markup: suiMarkupAmount } }), {
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

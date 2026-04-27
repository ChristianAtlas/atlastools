import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[PAYROLL-INVOICE] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

interface Line {
  description: string;
  category: string;
  section_label: string;
  tier_slug: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  is_internal: boolean;
  included_in_total: boolean;
  is_markup: boolean;
  markup_type?: string;
  markup_rate?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { payroll_run_id, force_recalc } = await req.json();
    if (!payroll_run_id) throw new Error("payroll_run_id is required");

    log("start", { payroll_run_id, force_recalc });

    // Existing invoice?
    const { data: existing } = await supabase
      .from("invoices").select("id, status")
      .eq("payroll_run_id", payroll_run_id).eq("invoice_type", "payroll").maybeSingle();
    if (existing && !force_recalc) {
      return new Response(JSON.stringify({ invoice_id: existing.id, message: "Invoice already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (existing && force_recalc) {
      // void the old one
      await supabase.from("invoices").update({ status: "voided" } as any).eq("id", existing.id);
      await supabase.from("invoice_line_items").delete().eq("invoice_id", existing.id);
    }

    // payroll run + company
    const { data: run, error: runErr } = await supabase
      .from("payroll_runs").select("*, companies(name)").eq("id", payroll_run_id).single();
    if (runErr || !run) throw new Error(`Payroll run not found: ${payroll_run_id}`);

    // employees
    const { data: emps } = await supabase
      .from("payroll_run_employees").select("*").eq("payroll_run_id", payroll_run_id)
      .in("status", ["processed", "calculated", "pending"]);
    const empIds = (emps ?? []).map((e: any) => e.id);
    const empCount = emps?.length ?? 0;

    // detail rows (taxes / contributions) for SUI state and benefit breakdown
    let taxRows: any[] = [];
    let contribRows: any[] = [];
    if (empIds.length) {
      const { data: t } = await supabase.from("payroll_run_employee_taxes").select("*").in("payroll_run_employee_id", empIds);
      const { data: c } = await supabase.from("payroll_run_employee_contributions").select("*").in("payroll_run_employee_id", empIds);
      taxRows = t ?? []; contribRows = c ?? [];
    }

    // Aggregate from denormalized columns (fast path), supplement with detail rows
    let grossW2 = 0;
    let eeFedTax = 0, eeStateTax = 0, eeLocalTax = 0, eeSS = 0, eeMedicare = 0;
    let eeBenefitsDed = 0, eeRetirement = 0, eeGarnishments = 0, eeOther = 0;
    let erFica = 0, erFuta = 0, erSui = 0, erBenefits = 0, wcCents = 0;

    for (const e of (emps ?? [])) {
      grossW2 += Number(e.gross_pay_cents) || 0;
      eeFedTax += Number(e.federal_tax_cents) || 0;
      eeStateTax += Number(e.state_tax_cents) || 0;
      eeLocalTax += Number(e.local_tax_cents) || 0;
      eeSS += Number(e.social_security_cents) || 0;
      eeMedicare += Number(e.medicare_cents) || 0;
      eeBenefitsDed += Number(e.benefits_deduction_cents) || 0;
      eeRetirement += Number(e.retirement_deduction_cents) || 0;
      eeGarnishments += Number(e.garnishment_cents) || 0;
      eeOther += Number(e.other_deductions_cents) || 0;
      erFica += Number(e.employer_fica_cents) || 0;
      erFuta += Number(e.employer_futa_cents) || 0;
      erSui += Number(e.employer_sui_cents) || 0;
      erBenefits += Number(e.employer_benefits_cents) || 0;
      wcCents += Number(e.workers_comp_cents) || 0;
    }

    // 1099 vendor payments in this period
    const { data: vendorRuns } = await supabase
      .from("vendor_payment_runs").select("id")
      .eq("company_id", run.company_id)
      .gte("pay_date", run.pay_period_start).lte("pay_date", run.pay_period_end)
      .neq("status", "voided");
    const vrIds = (vendorRuns ?? []).map((r: any) => r.id);
    let vendor1099 = 0; let vendorCount = 0;
    if (vrIds.length) {
      const { data: vp } = await supabase
        .from("vendor_payments").select("gross_amount_cents, vendor_id")
        .in("vendor_payment_run_id", vrIds).neq("status", "voided");
      const uniq = new Set<string>();
      for (const p of (vp ?? [])) {
        vendor1099 += Number(p.gross_amount_cents) || 0;
        if (p.vendor_id) uniq.add(p.vendor_id);
      }
      vendorCount = uniq.size;
    }

    // Determine SUI markup per state. PEO-reporting state == row exists in peo_sui_rates.
    const { data: peoStates } = await supabase
      .from("peo_sui_rates").select("state_code");
    const peoSet = new Set((peoStates ?? []).map((s: any) => s.state_code));

    // SUI per state from tax rows
    const suiByState: Record<string, number> = {};
    for (const t of taxRows) {
      if (t.ee_or_er === "er" && (t.tax_type === "sui" || t.tax_type === "SUI")) {
        const code = t.state_code || t.jurisdiction || "";
        suiByState[code] = (suiByState[code] || 0) + (Number(t.amount_cents) || 0);
      }
    }
    // If no detailed SUI rows, fall back to denormalized erSui (treat as PEO)
    let suiBaseInternal = 0; let suiBilled = 0;
    if (Object.keys(suiByState).length) {
      for (const [code, amt] of Object.entries(suiByState)) {
        suiBaseInternal += amt;
        if (peoSet.has(code)) suiBilled += Math.round(amt * 1.025);
        else suiBilled += amt;
      }
    } else {
      suiBaseInternal = erSui;
      suiBilled = Math.round(erSui * 1.025); // assume PEO when unknown
    }
    const suiMarkupInternal = suiBilled - suiBaseInternal;

    // Workers' comp: 1.5% invisible markup (rate config baked in at WC engine; here we just bill +1.5%)
    const wcBilled = Math.round(wcCents * 1.015);
    const wcMarkupInternal = wcBilled - wcCents;

    // ───── Build categorized line items ─────
    const lines: Line[] = [];
    const SEC = {
      payments: "Total Payments",
      ee_taxes: "Employee Tax Withholdings",
      ee_deds: "Employee Deductions",
      er_taxes: "Employer Tax Contributions",
      er_benefits: "Employer Benefit Contributions",
      internal: "Internal",
    };

    // Section 1: Total Payments (BILLED)
    if (grossW2 > 0) lines.push({
      description: `W-2 Employee Wages (${empCount} employees)`, category: "gross_pay",
      section_label: SEC.payments, tier_slug: "gross_pay", quantity: empCount,
      unit_price_cents: grossW2, total_cents: grossW2, is_internal: false, included_in_total: true,
      is_markup: false,
    });
    if (vendor1099 > 0) lines.push({
      description: `1099 Contractor Payments (${vendorCount} contractors)`, category: "gross_pay",
      section_label: SEC.payments, tier_slug: "vendor_payments", quantity: vendorCount,
      unit_price_cents: vendor1099, total_cents: vendor1099, is_internal: false, included_in_total: true,
      is_markup: false,
    });

    // Section 2: Employee Tax Withholdings (INFORMATIONAL — included_in_total=false)
    const eeTaxLines: [string, number][] = [
      ["Federal Income Tax", eeFedTax],
      ["Social Security (Employee)", eeSS],
      ["Medicare (Employee)", eeMedicare],
      ["State Income Tax", eeStateTax],
      ["Local Income Tax", eeLocalTax],
    ];
    for (const [label, amt] of eeTaxLines) {
      if (amt > 0) lines.push({
        description: label, category: "employee_taxes", section_label: SEC.ee_taxes,
        tier_slug: null, quantity: 1, unit_price_cents: amt, total_cents: amt,
        is_internal: false, included_in_total: false, is_markup: false,
      });
    }

    // Section 3: Employee Deductions (INFORMATIONAL)
    const eeDedLines: [string, number][] = [
      ["Retirement (401k/403b)", eeRetirement],
      ["Health, Dental, Vision & FSA", eeBenefitsDed],
      ["Garnishments", eeGarnishments],
      ["Other Deductions", eeOther],
    ];
    for (const [label, amt] of eeDedLines) {
      if (amt > 0) lines.push({
        description: label, category: "employee_deductions", section_label: SEC.ee_deds,
        tier_slug: null, quantity: 1, unit_price_cents: amt, total_cents: amt,
        is_internal: false, included_in_total: false, is_markup: false,
      });
    }

    // Section 4: Employer Tax Contributions (BILLED, with SUI markup baked in)
    if (erFuta > 0) lines.push({
      description: "Federal Unemployment Tax (FUTA)", category: "employer_taxes",
      section_label: SEC.er_taxes, tier_slug: null, quantity: 1,
      unit_price_cents: erFuta, total_cents: erFuta,
      is_internal: false, included_in_total: true, is_markup: false,
    });
    if (erFica > 0) lines.push({
      description: "Employer Social Security & Medicare", category: "employer_taxes",
      section_label: SEC.er_taxes, tier_slug: null, quantity: 1,
      unit_price_cents: erFica, total_cents: erFica,
      is_internal: false, included_in_total: true, is_markup: false,
    });
    if (suiBilled > 0) lines.push({
      description: "State Unemployment Tax (SUI)", category: "employer_taxes",
      section_label: SEC.er_taxes, tier_slug: null, quantity: 1,
      unit_price_cents: suiBilled, total_cents: suiBilled,
      is_internal: false, included_in_total: true, is_markup: false,
    });

    // Section 5: Employer Benefit Contributions (BILLED, WC markup baked in)
    if (wcBilled > 0) lines.push({
      description: "Workers' Compensation Premium", category: "employer_benefits",
      section_label: SEC.er_benefits, tier_slug: "workers_comp", quantity: 1,
      unit_price_cents: wcBilled, total_cents: wcBilled,
      is_internal: false, included_in_total: true, is_markup: false,
    });
    if (erBenefits > 0) lines.push({
      description: "Employer Benefit Contributions (401k Match, Health, etc.)",
      category: "employer_benefits", section_label: SEC.er_benefits, tier_slug: null,
      quantity: 1, unit_price_cents: erBenefits, total_cents: erBenefits,
      is_internal: false, included_in_total: true, is_markup: false,
    });

    // Internal markup tracking (hidden from client)
    if (suiMarkupInternal > 0) lines.push({
      description: "[Internal] SUI Markup (2.5%, PEO states only)", category: "markup_internal",
      section_label: SEC.internal, tier_slug: "sui_markup_internal", quantity: 1,
      unit_price_cents: suiMarkupInternal, total_cents: suiMarkupInternal,
      is_internal: true, included_in_total: false, is_markup: true,
      markup_type: "sui", markup_rate: 0.025,
    });
    if (wcMarkupInternal > 0) lines.push({
      description: "[Internal] Workers' Comp Markup (1.5%)", category: "markup_internal",
      section_label: SEC.internal, tier_slug: "wc_markup_internal", quantity: 1,
      unit_price_cents: wcMarkupInternal, total_cents: wcMarkupInternal,
      is_internal: true, included_in_total: false, is_markup: true,
      markup_type: "workers_comp", markup_rate: 0.015,
    });

    // Total = sum of included_in_total client lines
    const subtotal = lines.filter(l => l.included_in_total && !l.is_internal)
      .reduce((s, l) => s + l.total_cents, 0);
    const markupCents = suiMarkupInternal + wcMarkupInternal;
    const totalCents = subtotal;

    const invoiceNumber = `INV-P-${run.pay_date.replace(/-/g, "")}-${run.company_id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();

    const { data: invoice, error: invErr } = await supabase
      .from("invoices").insert({
        company_id: run.company_id, company_name: run.companies?.name || run.company_id,
        invoice_number: invoiceNumber, invoice_type: "payroll", payroll_run_id: run.id,
        period_start: run.pay_period_start, period_end: run.pay_period_end,
        subtotal_cents: subtotal, markup_cents: markupCents, total_cents: totalCents,
        balance_due_cents: totalCents, status: "due_immediately",
        due_date: run.pay_date, delivery_status: "sent", sent_at: now.toISOString(),
        issued_at: now.toISOString(), employee_count: empCount,
      } as any).select().single();
    if (invErr) throw invErr;

    await supabase.from("invoice_line_items")
      .insert(lines.map(l => ({ ...l, invoice_id: invoice.id })) as any);

    await supabase.from("payroll_runs").update({ invoice_status: "generated" } as any)
      .eq("id", payroll_run_id);

    // AR
    const { data: bp } = await supabase.from("billing_profiles").select("*")
      .eq("company_id", run.company_id).maybeSingle();
    if (bp) {
      await supabase.from("billing_profiles").update({
        current_ar_balance_cents: (bp.current_ar_balance_cents || 0) + totalCents,
      } as any).eq("id", bp.id);
    }

    // Activity log
    await supabase.from("billing_activity_logs").insert({
      company_id: run.company_id, invoice_id: invoice.id,
      event_type: "invoice_generated",
      payload: { invoice_type: "payroll", total_cents: totalCents, payroll_run_id: run.id },
    } as any);

    log("created", { invoice_id: invoice.id, total: totalCents });

    // Trigger autopay if enabled
    if (bp?.autopay_enabled && totalCents > 0) {
      try {
        await supabase.functions.invoke("charge-invoice-autopay", { body: { invoice_id: invoice.id } });
      } catch (e) {
        log("autopay-invoke-failed", { error: String(e) });
      }
    }

    return new Response(JSON.stringify({
      invoice, totals: { subtotal, total: totalCents, markup: markupCents },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: unknown) =>
  console.log(`[WC-CALC] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

/**
 * Compute per-employee Workers' Comp charges for a payroll run.
 *
 * Snapshots the rate row in effect at the payroll's pay_date so that closed
 * payroll invoices remain accurate even if codes/rates change later.
 *
 * Returns:
 *   { processed, missing_assignments, total_base_cents, total_markup_cents,
 *     total_charge_cents, exceptions: [{employee_id,...}] }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const payroll_run_id: string | undefined = body?.payroll_run_id;
    if (!payroll_run_id || typeof payroll_run_id !== "string") {
      return new Response(
        JSON.stringify({ error: "payroll_run_id (uuid string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log("start", { payroll_run_id });

    // 1. Load run + employees
    const { data: run, error: runErr } = await supabase
      .from("payroll_runs")
      .select("id, company_id, pay_date, pay_period_start, pay_period_end")
      .eq("id", payroll_run_id)
      .single();
    if (runErr || !run) throw new Error(`Payroll run not found: ${payroll_run_id}`);

    const { data: runEmps, error: empErr } = await supabase
      .from("payroll_run_employees")
      .select("id, employee_id, gross_pay_cents, regular_hours, overtime_hours, holiday_hours, pto_hours, status")
      .eq("payroll_run_id", payroll_run_id);
    if (empErr) throw empErr;

    const eligible = (runEmps || []).filter(
      (e) => Number(e.gross_pay_cents) > 0 &&
        ["pending", "calculated", "processed"].includes(String(e.status)),
    );

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No eligible employees" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Pull active assignments + master/per-client policy + markup defaults
    const empIds = eligible.map((e) => e.employee_id);

    const { data: assigns } = await supabase
      .from("employee_wc_assignments")
      .select("employee_id, wc_code_id, effective_date")
      .eq("company_id", run.company_id)
      .in("employee_id", empIds)
      .eq("is_active", true);

    const assignByEmp = new Map<string, { wc_code_id: string; effective_date: string }>();
    for (const a of assigns || []) assignByEmp.set(String(a.employee_id), a as any);

    const codeIds = Array.from(new Set((assigns || []).map((a) => a.wc_code_id)));

    const { data: codes } = codeIds.length
      ? await supabase
        .from("workers_comp_codes")
        .select("id, code, description, state, rate_per_hundred, rate_basis, internal_markup_rate, markup_rate_override, policy_id")
        .in("id", codeIds)
      : { data: [] };
    const codeById = new Map<string, any>();
    for (const c of codes || []) codeById.set(c.id, c);

    // Pull rate history rows in effect at pay_date for each code
    const { data: rateRows } = codeIds.length
      ? await supabase
        .from("workers_comp_code_rates")
        .select("id, wc_code_id, rate_per_hundred, rate_basis, markup_rate, effective_date, end_date")
        .in("wc_code_id", codeIds)
        .lte("effective_date", run.pay_date)
      : { data: [] };

    const rateByCode = new Map<string, any>();
    for (const r of rateRows || []) {
      if (r.end_date && r.end_date < run.pay_date) continue;
      const existing = rateByCode.get(r.wc_code_id);
      if (!existing || existing.effective_date < r.effective_date) {
        rateByCode.set(r.wc_code_id, r);
      }
    }

    // 3. Wipe prior calc rows for this run (idempotent)
    await supabase.from("wc_payroll_calculations").delete().eq("payroll_run_id", payroll_run_id);

    // 4. Compute per-employee
    const calcs: any[] = [];
    const exceptions: any[] = [];
    let totalBase = 0;
    let totalMarkup = 0;

    for (const e of eligible) {
      const a = assignByEmp.get(String(e.employee_id));
      if (!a) {
        exceptions.push({ employee_id: e.employee_id, reason: "missing_wc_assignment" });
        continue;
      }
      const code = codeById.get(a.wc_code_id);
      const rateRow = rateByCode.get(a.wc_code_id);
      if (!code || !rateRow) {
        exceptions.push({ employee_id: e.employee_id, reason: "missing_rate_in_history" });
        continue;
      }

      const basis = String(rateRow.rate_basis || "per_hundred");
      const rate = Number(rateRow.rate_per_hundred || 0);
      const markupRate = Number(rateRow.markup_rate ?? 0.015);

      let basePremiumCents = 0;
      let hours = 0;
      if (basis === "per_hour") {
        hours =
          Number(e.regular_hours || 0) +
          Number(e.overtime_hours || 0) +
          Number(e.holiday_hours || 0) +
          Number(e.pto_hours || 0);
        // rate is dollars-per-hour expressed as numeric
        basePremiumCents = Math.round(hours * rate * 100);
      } else {
        // per $100 of wages: premium = wages/100 * rate  → cents = wages_cents * rate / 100
        basePremiumCents = Math.round((Number(e.gross_pay_cents) * rate) / 100);
      }

      const markupCents = Math.round(basePremiumCents * markupRate);
      const totalCents = basePremiumCents + markupCents;

      totalBase += basePremiumCents;
      totalMarkup += markupCents;

      calcs.push({
        payroll_run_id,
        employee_id: e.employee_id,
        company_id: run.company_id,
        wc_code_id: a.wc_code_id,
        wc_code_rate_id: rateRow.id,
        wc_code: code.code,
        wages_cents: Number(e.gross_pay_cents),
        hours,
        rate_per_hundred: rate,
        rate_basis: basis,
        premium_cents: basePremiumCents,
        markup_rate: markupRate,
        markup_cents: markupCents,
        total_charge_cents: totalCents,
      });

      // Roll up to payroll_run_employees.workers_comp_cents
      await supabase
        .from("payroll_run_employees")
        .update({ workers_comp_cents: totalCents })
        .eq("id", e.id);
    }

    if (calcs.length) {
      const { error: calcErr } = await supabase.from("wc_payroll_calculations").insert(calcs);
      if (calcErr) throw calcErr;
    }

    // 5. Roll up run total
    const totalCharge = totalBase + totalMarkup;
    await supabase
      .from("payroll_runs")
      .update({ workers_comp_cents: totalCharge, exception_count: exceptions.length })
      .eq("id", payroll_run_id);

    // 6. Upsert wc_invoice_items snapshot for billing
    await supabase.from("wc_invoice_items").delete().eq("payroll_run_id", payroll_run_id);
    if (calcs.length) {
      await supabase.from("wc_invoice_items").insert({
        payroll_run_id,
        company_id: run.company_id,
        base_premium_cents: totalBase,
        markup_cents: totalMarkup,
        total_charge_cents: totalCharge,
        employee_count: calcs.length,
      });
    }

    log("done", {
      processed: calcs.length,
      missing: exceptions.length,
      totalCharge,
    });

    return new Response(
      JSON.stringify({
        processed: calcs.length,
        missing_assignments: exceptions.length,
        total_base_cents: totalBase,
        total_markup_cents: totalMarkup,
        total_charge_cents: totalCharge,
        exceptions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const log = (s: string, d?: unknown) =>
  console.log(`[MONTHLY-INVOICE] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

interface Line {
  description: string; category: string; section_label: string;
  tier_slug: string | null; quantity: number; unit_price_cents: number;
  total_cents: number; is_internal: boolean; included_in_total: boolean; is_markup: boolean;
}

const FLAT_FEE_CENTS = 6500;          // $65
const PEO_BASIC_CENTS = 8000;         // $80
const PEO_EXTRA_CENTS = 11000;        // $110
const TIME_TRACKING_CENTS = 800;      // $8
const CONTRACTOR_CENTS = 3900;        // $39
const HR_CONSULTING_CENTS = 3000;     // $30

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    // billing month = invoice generation month (e.g. 2026-04 means we bill for activity in 2026-03)
    const today = new Date();
    const genMonth = body.billing_month || `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
    const genDate = `${genMonth}-01`;
    const targetCompanyId = body.company_id;

    // Activity period = previous calendar month
    const [gy, gm] = genMonth.split("-").map(Number);
    const prevDate = new Date(Date.UTC(gy, gm - 2, 1));
    const activityStart = prevDate.toISOString().slice(0, 10);
    const activityEnd = new Date(Date.UTC(gy, gm - 1, 0)).toISOString().slice(0, 10);

    log("start", { genMonth, activityStart, activityEnd, targetCompanyId });

    let q = supabase.from("companies").select("id, name").eq("status", "active").is("deleted_at", null);
    if (targetCompanyId) q = q.eq("id", targetCompanyId);
    const { data: companies, error: cErr } = await q;
    if (cErr) throw cErr;

    const results: any[] = [];

    for (const company of companies ?? []) {
      // skip duplicates
      const { data: existing } = await supabase.from("invoices").select("id")
        .eq("company_id", company.id).eq("invoice_type", "monthly")
        .eq("period_start", genDate).maybeSingle();
      if (existing) { log("skip-existing", { company: company.name }); continue; }

      // Plan
      const { data: plan } = await supabase.from("company_plans")
        .select("*, pricing_tiers(*)").eq("company_id", company.id)
        .eq("status", "active").maybeSingle();

      // Billing profile (for AR + autopay)
      const { data: bp } = await supabase.from("billing_profiles").select("*")
        .eq("company_id", company.id).maybeSingle();

      const lines: Line[] = [];
      const SEC = { fee: "Service Fees", addons: "Add-Ons", catchup: "Catch-Up Charges" };

      // 1. FLAT MONTHLY FEE — always $65
      lines.push({
        description: "Monthly Service Fee", category: "service_fee", section_label: SEC.fee,
        tier_slug: "monthly_service", quantity: 1,
        unit_price_cents: FLAT_FEE_CENTS, total_cents: FLAT_FEE_CENTS,
        is_internal: false, included_in_total: true, is_markup: false,
      });

      // 2. PEO PLAN — bill per W-2 employee actually paid in activity month
      const { data: paidRuns } = await supabase.from("payroll_runs")
        .select("id").eq("company_id", company.id)
        .gte("pay_date", activityStart).lte("pay_date", activityEnd)
        .in("status", ["completed", "paid", "funded", "auto_approved", "client_approved", "admin_approved"] as any);
      const runIds = (paidRuns ?? []).map((r: any) => r.id);
      const paidEmployeeIds = new Set<string>();
      if (runIds.length) {
        const { data: pre } = await supabase.from("payroll_run_employees")
          .select("employee_id").in("payroll_run_id", runIds)
          .in("status", ["processed", "calculated"] as any);
        for (const r of (pre ?? [])) if (r.employee_id) paidEmployeeIds.add(r.employee_id);
      }
      const paidEeCount = paidEmployeeIds.size;

      // Determine plan rate
      let planRateCents = 0; let planLabel = "PEO Plan";
      const planSlug = plan?.pricing_tiers?.slug || "";
      if (planSlug === "peo_extra") { planRateCents = PEO_EXTRA_CENTS; planLabel = "PEO Extra"; }
      else if (planSlug === "peo_basic") { planRateCents = PEO_BASIC_CENTS; planLabel = "PEO Basic"; }
      else if (plan?.pricing_tiers?.unit_price_cents) {
        planRateCents = plan.pricing_tiers.unit_price_cents;
        planLabel = plan.pricing_tiers.name || "PEO Plan";
      }

      if (planRateCents > 0 && paidEeCount > 0) {
        lines.push({
          description: `${planLabel} × ${paidEeCount} employee${paidEeCount === 1 ? "" : "s"} paid`,
          category: "service_fee", section_label: SEC.fee, tier_slug: planSlug || "peo_plan",
          quantity: paidEeCount, unit_price_cents: planRateCents,
          total_cents: planRateCents * paidEeCount,
          is_internal: false, included_in_total: true, is_markup: false,
        });
      }

      // 3. TIME TRACKING ADD-ON — $8 × employees with punches OR PTO entries
      const { data: tk } = await supabase.from("timekeeping_settings")
        .select("is_enabled").eq("company_id", company.id).maybeSingle();
      if (tk?.is_enabled) {
        const { data: punches } = await supabase.from("tk_punches")
          .select("employee_id").eq("company_id", company.id).eq("voided", false)
          .gte("punched_at", `${activityStart}T00:00:00Z`)
          .lte("punched_at", `${activityEnd}T23:59:59Z`);
        const { data: pto } = await supabase.from("pto_requests")
          .select("employee_id").eq("company_id", company.id)
          .gte("start_date", activityStart).lte("start_date", activityEnd);
        const set = new Set<string>();
        (punches ?? []).forEach((p: any) => p.employee_id && set.add(p.employee_id));
        (pto ?? []).forEach((p: any) => p.employee_id && set.add(p.employee_id));
        if (set.size > 0) {
          lines.push({
            description: `Time Tracking × ${set.size} active employee${set.size === 1 ? "" : "s"}`,
            category: "addon", section_label: SEC.addons, tier_slug: "time_tracking",
            quantity: set.size, unit_price_cents: TIME_TRACKING_CENTS,
            total_cents: TIME_TRACKING_CENTS * set.size,
            is_internal: false, included_in_total: true, is_markup: false,
          });
        }
      }

      // 4. CONTRACTOR ADD-ON — $39 × distinct vendors paid this month
      const { data: vRuns } = await supabase.from("vendor_payment_runs")
        .select("id").eq("company_id", company.id)
        .gte("pay_date", activityStart).lte("pay_date", activityEnd)
        .neq("status", "voided");
      const vRunIds = (vRuns ?? []).map((r: any) => r.id);
      let uniqueVendors = 0;
      if (vRunIds.length) {
        const { data: vp } = await supabase.from("vendor_payments")
          .select("vendor_id").in("vendor_payment_run_id", vRunIds).neq("status", "voided");
        const set = new Set<string>();
        (vp ?? []).forEach((p: any) => p.vendor_id && set.add(p.vendor_id));
        uniqueVendors = set.size;
      }
      if (uniqueVendors > 0) {
        lines.push({
          description: `Contractor Payments × ${uniqueVendors} paid contractor${uniqueVendors === 1 ? "" : "s"}`,
          category: "addon", section_label: SEC.addons, tier_slug: "contractors",
          quantity: uniqueVendors, unit_price_cents: CONTRACTOR_CENTS,
          total_cents: CONTRACTOR_CENTS * uniqueVendors,
          is_internal: false, included_in_total: true, is_markup: false,
        });
      }

      // 5. HR CONSULTING ADD-ON — $30 × paid employees if active
      let hrAddonActive = false;
      if (plan?.id) {
        const { data: addons } = await supabase.from("company_addons")
          .select("*, pricing_tiers(slug)").eq("company_plan_id", plan.id);
        hrAddonActive = (addons ?? []).some((a: any) => a.pricing_tiers?.slug === "hr_consulting");
      }
      if (hrAddonActive && paidEeCount > 0) {
        lines.push({
          description: `Dedicated HR Consulting × ${paidEeCount} employee${paidEeCount === 1 ? "" : "s"}`,
          category: "addon", section_label: SEC.addons, tier_slug: "hr_consulting",
          quantity: paidEeCount, unit_price_cents: HR_CONSULTING_CENTS,
          total_cents: HR_CONSULTING_CENTS * paidEeCount,
          is_internal: false, included_in_total: true, is_markup: false,
        });
      }

      // 6. CATCH-UP — employees paid in prior-prior month but missing from prior monthly_employee_billing
      const prevPrev = new Date(Date.UTC(gy, gm - 3, 1)).toISOString().slice(0, 10);
      const { data: prevBilled } = await supabase.from("monthly_employee_billing")
        .select("employee_id").eq("company_id", company.id)
        .eq("billing_month", prevPrev).eq("status", "billed");
      const prevBilledSet = new Set((prevBilled ?? []).map((b: any) => b.employee_id));
      // Catch-up = anyone paid this activity month who wasn't on the prior billing roster
      // (signals new hire start where last month's invoice missed them)
      const catchUpIds = [...paidEmployeeIds].filter(id => !prevBilledSet.has(id));
      // Only catch up if they were actually active during prev-prev month — proxy: skip if zero prev billed
      let catchUpCount = 0; let catchUpCents = 0;
      if (prevBilledSet.size > 0 && catchUpIds.length > 0 && planRateCents > 0) {
        catchUpCount = catchUpIds.length;
        catchUpCents = planRateCents * catchUpCount;
        lines.push({
          description: `Catch-up: ${catchUpCount} employee${catchUpCount === 1 ? "" : "s"} from prior month`,
          category: "catch_up", section_label: SEC.catchup, tier_slug: "catch_up",
          quantity: catchUpCount, unit_price_cents: planRateCents, total_cents: catchUpCents,
          is_internal: false, included_in_total: true, is_markup: false,
        });
      }

      const totalCents = lines.filter(l => l.included_in_total).reduce((s, l) => s + l.total_cents, 0);
      if (totalCents <= 0) { log("skip-zero", { company: company.name }); continue; }

      const periodEnd = new Date(Date.UTC(gy, gm, 0)).toISOString().slice(0, 10);
      const invoiceNumber = `INV-M-${genMonth.replace("-", "")}-${company.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();

      const { data: invoice, error: invErr } = await supabase.from("invoices").insert({
        company_id: company.id, company_name: company.name,
        invoice_number: invoiceNumber, invoice_type: "monthly",
        period_start: genDate, period_end: periodEnd,
        billing_period_start: activityStart, billing_period_end: activityEnd,
        subtotal_cents: totalCents, markup_cents: 0, total_cents: totalCents,
        balance_due_cents: totalCents, status: "sent",
        due_date: genDate, delivery_status: "sent", sent_at: now.toISOString(),
        issued_at: now.toISOString(), employee_count: paidEeCount,
        catch_up_count: catchUpCount, catch_up_cents: catchUpCents,
      } as any).select().single();
      if (invErr) { log("invErr", { company: company.name, err: invErr.message }); continue; }

      await supabase.from("invoice_line_items")
        .insert(lines.map(l => ({ ...l, invoice_id: invoice.id })) as any);

      // Update ledger
      const ledger = [...paidEmployeeIds].map(eid => ({
        employee_id: eid, company_id: company.id, billing_month: activityStart,
        tier_id: plan?.pricing_tiers?.id || null, charge_cents: planRateCents,
        status: "billed", catch_up_needed: false, catch_up_billed: false,
        invoice_id: invoice.id,
      }));
      if (ledger.length) {
        await supabase.from("monthly_employee_billing")
          .upsert(ledger as any, { onConflict: "employee_id,billing_month" });
      }

      if (bp) {
        await supabase.from("billing_profiles").update({
          current_ar_balance_cents: (bp.current_ar_balance_cents || 0) + totalCents,
        } as any).eq("id", bp.id);
      }

      await supabase.from("billing_activity_logs").insert({
        company_id: company.id, invoice_id: invoice.id,
        event_type: "invoice_generated",
        payload: { invoice_type: "monthly", total_cents: totalCents, billing_month: genMonth },
      } as any);

      // Autopay
      if (bp?.autopay_enabled && totalCents > 0) {
        try { await supabase.functions.invoke("charge-invoice-autopay", { body: { invoice_id: invoice.id } }); }
        catch (e) { log("autopay-fail", { err: String(e) }); }
      }

      results.push({ company_id: company.id, invoice_id: invoice.id, total_cents: totalCents });
      log("ok", { company: company.name, total: totalCents, paid_ees: paidEeCount });
    }

    return new Response(JSON.stringify({ invoices: results, count: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

/**
 * Auto-generate payroll runs for all active companies based on their payroll schedules.
 * Generates runs for the current and next pay periods.
 * Supports semi-monthly (salary) and bi-weekly (hourly) frequencies.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    // Fetch US holidays for business day adjustments
    const { data: holidays } = await client
      .from("us_holidays")
      .select("holiday_date")
      .eq("is_banking_holiday", true);
    const holidaySet = new Set((holidays ?? []).map((h: any) => h.holiday_date));

    function isBusinessDay(d: Date): boolean {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return false;
      const ds = d.toISOString().split("T")[0];
      return !holidaySet.has(ds);
    }

    function prevBusinessDay(d: Date): Date {
      const result = new Date(d);
      while (!isBusinessDay(result)) {
        result.setDate(result.getDate() - 1);
      }
      return result;
    }

    function fmt(d: Date): string {
      return d.toISOString().split("T")[0];
    }

    // Fetch active payroll schedules
    const { data: schedules, error: schErr } = await client
      .from("payroll_schedules")
      .select("*, companies(id, name, status)")
      .eq("is_active", true);

    if (schErr) throw schErr;

    // Also fetch companies with no explicit schedule but active employees
    const { data: companies } = await client
      .from("companies")
      .select("id, name, status, settings")
      .eq("status", "active")
      .is("deleted_at", null);

    const now = new Date();
    const results: any[] = [];

    // Generate periods for each schedule
    for (const schedule of (schedules ?? [])) {
      const companyId = schedule.company_id;
      const freq = schedule.pay_frequency;

      // Get existing runs for this company + frequency to avoid duplicates
      const { data: existingRuns } = await client
        .from("payroll_runs")
        .select("pay_period_start, pay_period_end")
        .eq("company_id", companyId)
        .eq("pay_frequency", freq)
        .is("deleted_at", null);

      const existingPeriods = new Set(
        (existingRuns ?? []).map((r: any) => `${r.pay_period_start}_${r.pay_period_end}`)
      );

      const periodsToCreate = getPayPeriods(freq, now);

      for (const period of periodsToCreate) {
        const key = `${period.start}_${period.end}`;
        if (existingPeriods.has(key)) continue;

        const payDate = prevBusinessDay(new Date(period.rawPayDate));
        const approvalDeadline = computeApprovalDeadline(freq, payDate, schedule);
        const timecardDeadline = freq === "biweekly"
          ? computeTimecardDeadline(new Date(period.end))
          : null;
        const expeditedDeadline = freq === "biweekly"
          ? computeExpeditedDeadline(payDate)
          : null;

        // Determine initial status
        const periodStart = new Date(period.start);
        const status = periodStart > now ? "upcoming" : (freq === "biweekly" ? "open_for_timecards" : "open");

        // Fetch active employees for this company + frequency
        const payTypeFilter = freq === "semimonthly" ? "salary" : "hourly";
        const { data: employees } = await client
          .from("employees")
          .select("id, pay_type, annual_salary_cents, hourly_rate_cents, pay_frequency")
          .eq("company_id", companyId)
          .eq("status", "active")
          .eq("pay_frequency", freq)
          .is("deleted_at", null);

        const activeEmps = employees ?? [];

        // Create the payroll run
        const { data: run, error: runErr } = await client
          .from("payroll_runs")
          .insert({
            company_id: companyId,
            run_type: "regular",
            pay_frequency: freq,
            pay_period_start: period.start,
            pay_period_end: period.end,
            pay_date: fmt(payDate),
            status,
            created_by: "00000000-0000-0000-0000-000000000000", // system
            approval_deadline: approvalDeadline?.toISOString() ?? null,
            timecard_deadline: timecardDeadline?.toISOString() ?? null,
            expedited_deadline: expeditedDeadline?.toISOString() ?? null,
            auto_approved: schedule.auto_approve_enabled,
            employee_count: activeEmps.length,
          })
          .select()
          .single();

        if (runErr) {
          console.error("Failed to create run:", runErr);
          continue;
        }

        // Create employee lines
        if (activeEmps.length > 0) {
          const lines = activeEmps.map((emp: any) => {
            let regularPayCents = 0;
            let regularHours = 0;
            if (emp.pay_type === "salary" && emp.annual_salary_cents) {
              regularPayCents = Math.round(emp.annual_salary_cents / 24); // semi-monthly
              regularHours = 86.67;
            } else if (emp.pay_type === "hourly" && emp.hourly_rate_cents) {
              regularHours = 80;
              regularPayCents = Math.round(emp.hourly_rate_cents * regularHours);
            }
            return {
              payroll_run_id: run.id,
              employee_id: emp.id,
              company_id: companyId,
              status: "pending",
              regular_hours: regularHours,
              regular_pay_cents: regularPayCents,
              gross_pay_cents: regularPayCents,
              net_pay_cents: 0,
              total_deductions_cents: 0,
              total_employer_cost_cents: 0,
            };
          });

          await client.from("payroll_run_employees").insert(lines);

          // Update gross pay on run
          const totalGross = lines.reduce((s: number, l: any) => s + l.gross_pay_cents, 0);
          await client
            .from("payroll_runs")
            .update({ gross_pay_cents: totalGross })
            .eq("id", run.id);
        }

        // Create timecards for hourly bi-weekly
        if (freq === "biweekly" && activeEmps.length > 0) {
          const timecards = activeEmps.map((emp: any) => ({
            employee_id: emp.id,
            payroll_run_id: run.id,
            company_id: companyId,
            regular_hours: 0,
            overtime_hours: 0,
            pto_hours: 0,
            holiday_hours: 0,
            approval_status: "pending",
          }));
          await client.from("timecards").insert(timecards);
        }

        results.push({ run_id: run.id, company_id: companyId, freq, period: key, status });
      }
    }

    return new Response(JSON.stringify({ generated: results.length, runs: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getPayPeriods(freq: string, now: Date): Array<{ start: string; end: string; rawPayDate: string }> {
  const periods: Array<{ start: string; end: string; rawPayDate: string }> = [];
  const year = now.getFullYear();
  const month = now.getMonth();

  if (freq === "semimonthly") {
    // Current month periods
    const p1Start = new Date(year, month, 1);
    const p1End = new Date(year, month, 15);
    const p2Start = new Date(year, month, 16);
    const p2End = new Date(year, month + 1, 0); // last day

    periods.push(
      { start: fmt(p1Start), end: fmt(p1End), rawPayDate: fmt(p1End) },
      { start: fmt(p2Start), end: fmt(p2End), rawPayDate: fmt(p2End) }
    );

    // Next month
    const nm = month + 1;
    const np1Start = new Date(year, nm, 1);
    const np1End = new Date(year, nm, 15);
    const np2Start = new Date(year, nm, 16);
    const np2End = new Date(year, nm + 1, 0);
    periods.push(
      { start: fmt(np1Start), end: fmt(np1End), rawPayDate: fmt(np1End) },
      { start: fmt(np2Start), end: fmt(np2End), rawPayDate: fmt(np2End) }
    );
  } else if (freq === "biweekly") {
    // Find the Sunday starting the current week, then build bi-weekly periods
    const dayOfWeek = now.getDay(); // 0=Sun
    const thisSunday = new Date(now);
    thisSunday.setDate(now.getDate() - dayOfWeek);

    // Generate 4 bi-weekly periods starting from 2 periods ago
    for (let i = -1; i <= 2; i++) {
      const start = new Date(thisSunday);
      start.setDate(thisSunday.getDate() + i * 14);
      const end = new Date(start);
      end.setDate(start.getDate() + 13); // Sun-Sat x2
      const payDate = new Date(end);
      payDate.setDate(end.getDate() + 6); // Following Friday
      // Adjust to actual Friday
      while (payDate.getDay() !== 5) payDate.setDate(payDate.getDate() + 1);
      periods.push({ start: fmt(start), end: fmt(end), rawPayDate: fmt(payDate) });
    }
  }

  return periods;

  function fmt(d: Date): string {
    return d.toISOString().split("T")[0];
  }
}

function computeApprovalDeadline(freq: string, payDate: Date, schedule: any): Date | null {
  if (freq === "semimonthly") {
    const daysBeforeRaw = schedule.approval_deadline_days_before ?? 4;
    const timeStr = schedule.approval_deadline_time ?? "17:00";
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(payDate);
    d.setDate(d.getDate() - daysBeforeRaw);
    d.setUTCHours(h + 5, m, 0, 0); // Convert EST to UTC
    return d;
  }
  if (freq === "biweekly") {
    // Tuesday 5 PM EST before pay date (Friday)
    const d = new Date(payDate);
    // Go back to Tuesday (Friday - 3 = Tuesday)
    d.setDate(d.getDate() - 3);
    d.setUTCHours(22, 0, 0, 0); // 5PM EST = 22:00 UTC
    return d;
  }
  return null;
}

function computeTimecardDeadline(periodEnd: Date): Date {
  // Monday 10:00 AM EST after the period ends (Saturday)
  const d = new Date(periodEnd);
  d.setDate(d.getDate() + 2); // +2 from Saturday = Monday
  d.setUTCHours(15, 0, 0, 0); // 10AM EST = 15:00 UTC
  return d;
}

function computeExpeditedDeadline(payDate: Date): Date {
  // Thursday 1:00 PM EST before pay date (Friday)
  const d = new Date(payDate);
  d.setDate(d.getDate() - 1); // Thursday
  d.setUTCHours(18, 0, 0, 0); // 1PM EST = 18:00 UTC
  return d;
}

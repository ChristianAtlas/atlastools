import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["super_admin", "client_admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const {
      company_id,
      run_type = "regular",
      pay_frequency = "biweekly",
      pay_period_start,
      pay_period_end,
      pay_date,
      check_date,
      notes,
    } = body;

    if (!company_id || !pay_period_start || !pay_period_end || !pay_date) {
      return new Response(JSON.stringify({ error: "Missing required fields: company_id, pay_period_start, pay_period_end, pay_date" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute submission deadline: next Tuesday 6PM EST from now
    const submissionDeadline = computeNextTuesday6pmEST();

    // Create the payroll run
    const { data: run, error: runError } = await adminClient
      .from("payroll_runs")
      .insert({
        company_id,
        run_type,
        pay_frequency,
        pay_period_start,
        pay_period_end,
        pay_date,
        check_date: check_date || null,
        submission_deadline: submissionDeadline,
        status: "draft",
        created_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (runError) {
      return new Response(JSON.stringify({ error: runError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active employees for this company
    const { data: employees, error: empError } = await adminClient
      .from("employees")
      .select("id, pay_type, annual_salary_cents, hourly_rate_cents, pay_frequency")
      .eq("company_id", company_id)
      .eq("status", "active")
      .is("deleted_at", null);

    if (empError) {
      return new Response(JSON.stringify({ error: empError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payroll_run_employees records with estimated pay
    if (employees && employees.length > 0) {
      const runEmployees = employees.map((emp) => {
        // Estimate per-period gross pay
        let regularPayCents = 0;
        let regularHours = 0;

        if (emp.pay_type === "salary" && emp.annual_salary_cents) {
          const periodsPerYear = emp.pay_frequency === "weekly" ? 52
            : emp.pay_frequency === "biweekly" ? 26
            : emp.pay_frequency === "semimonthly" ? 24
            : 12;
          regularPayCents = Math.round(emp.annual_salary_cents / periodsPerYear);
          regularHours = 80; // default biweekly
        } else if (emp.pay_type === "hourly" && emp.hourly_rate_cents) {
          regularHours = emp.pay_frequency === "weekly" ? 40
            : emp.pay_frequency === "biweekly" ? 80
            : emp.pay_frequency === "semimonthly" ? 86.67
            : 173.33;
          regularPayCents = Math.round(emp.hourly_rate_cents * regularHours);
        }

        return {
          payroll_run_id: run.id,
          employee_id: emp.id,
          company_id,
          status: "pending",
          regular_hours: regularHours,
          regular_pay_cents: regularPayCents,
          gross_pay_cents: regularPayCents,
          net_pay_cents: 0,
          total_deductions_cents: 0,
          total_employer_cost_cents: 0,
        };
      });

      const { error: insertError } = await adminClient
        .from("payroll_run_employees")
        .insert(runEmployees);

      if (insertError) {
        console.error("Failed to insert run employees:", insertError);
      }

      // Update employee count on the run
      await adminClient
        .from("payroll_runs")
        .update({
          employee_count: employees.length,
          gross_pay_cents: runEmployees.reduce((sum, e) => sum + e.gross_pay_cents, 0),
        })
        .eq("id", run.id);
    }

    return new Response(JSON.stringify({ id: run.id, employee_count: employees?.length ?? 0 }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function computeNextTuesday6pmEST(): string {
  const now = new Date();
  // EST = UTC-5 (ignoring DST for simplicity; EDT = UTC-4)
  // Find next Tuesday
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 2=Tue
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  if (daysUntilTuesday === 0) {
    // If today is Tuesday, check if we're past 6PM EST (23:00 UTC)
    const estHour = (now.getUTCHours() - 5 + 24) % 24;
    if (estHour >= 18) {
      daysUntilTuesday = 7; // next week
    }
  }

  const deadline = new Date(now);
  deadline.setUTCDate(deadline.getUTCDate() + daysUntilTuesday);
  deadline.setUTCHours(23, 0, 0, 0); // 6PM EST = 23:00 UTC (or 22:00 for EDT)
  return deadline.toISOString();
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GENERATE-INVOICE] ${step}${d}`);
};

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
    const { company_id, period_start, period_end, due_date, payroll_runs } = await req.json();
    logStep("Request received", { company_id, period_start, period_end });

    if (!company_id || !period_start || !period_end || !due_date) {
      throw new Error("Missing required fields: company_id, period_start, period_end, due_date");
    }

    // Get company plan with tier info
    const { data: plan, error: planError } = await supabase
      .from("company_plans")
      .select("*, pricing_tiers(*)")
      .eq("company_id", company_id)
      .eq("status", "active")
      .single();

    if (planError || !plan) {
      throw new Error(`No active plan found for company ${company_id}`);
    }
    logStep("Company plan found", { tier: plan.pricing_tiers.slug, employees: plan.employee_count });

    // Get company add-ons
    const { data: addons } = await supabase
      .from("company_addons")
      .select("*, pricing_tiers(*)")
      .eq("company_plan_id", plan.id);

    // Build line items
    const lineItems: Array<{
      description: string;
      tier_slug: string;
      quantity: number;
      unit_price_cents: number;
      total_cents: number;
      is_markup: boolean;
      markup_type?: string;
      markup_rate?: number;
    }> = [];

    // 1. Base plan (per-employee or flat)
    const baseTier = plan.pricing_tiers;
    const baseQty = baseTier.per_employee ? plan.employee_count : 1;
    const baseTotal = baseTier.unit_price_cents * baseQty;
    lineItems.push({
      description: `${baseTier.name} × ${baseQty} ${baseTier.per_employee ? "employees" : ""}`,
      tier_slug: baseTier.slug,
      quantity: baseQty,
      unit_price_cents: baseTier.unit_price_cents,
      total_cents: baseTotal,
      is_markup: false,
    });

    // 2. Monthly Service Charge (always included)
    const { data: serviceTier } = await supabase
      .from("pricing_tiers")
      .select("*")
      .eq("slug", "monthly_service")
      .single();

    if (serviceTier) {
      lineItems.push({
        description: serviceTier.name,
        tier_slug: serviceTier.slug,
        quantity: 1,
        unit_price_cents: serviceTier.unit_price_cents,
        total_cents: serviceTier.unit_price_cents,
        is_markup: false,
      });
    }

    // 3. Add-ons
    if (addons) {
      for (const addon of addons) {
        const t = addon.pricing_tiers;
        const qty = t.slug === "contractors" ? (plan.contractor_count || 0) : (addon.quantity || plan.employee_count);
        if (qty > 0) {
          lineItems.push({
            description: `${t.name} × ${qty} ${t.per_employee ? (t.slug === "contractors" ? "contractors" : "employees") : ""}`,
            tier_slug: t.slug,
            quantity: qty,
            unit_price_cents: t.unit_price_cents,
            total_cents: t.unit_price_cents * qty,
            is_markup: false,
          });
        }
      }
    }

    // 4. Payroll markups (1.5% general + 2.5% SUI)
    const markupItems: Array<{
      payroll_run_id: string;
      gross_wages_cents: number;
      general_markup_cents: number;
      sui_markup_cents: number;
      total_markup_cents: number;
    }> = [];

    if (payroll_runs && Array.isArray(payroll_runs)) {
      for (const pr of payroll_runs) {
        const grossCents = Math.round(pr.gross_pay * 100);
        const generalMarkup = Math.round(grossCents * 0.015);
        const suiMarkup = Math.round(grossCents * 0.025);
        const totalMarkup = generalMarkup + suiMarkup;

        markupItems.push({
          payroll_run_id: pr.id,
          gross_wages_cents: grossCents,
          general_markup_cents: generalMarkup,
          sui_markup_cents: suiMarkup,
          total_markup_cents: totalMarkup,
        });

        lineItems.push({
          description: `Payroll markup — General (1.5%) on $${(pr.gross_pay).toLocaleString()}`,
          tier_slug: "payroll_markup_general",
          quantity: 1,
          unit_price_cents: generalMarkup,
          total_cents: generalMarkup,
          is_markup: true,
          markup_type: "general",
          markup_rate: 0.015,
        });

        lineItems.push({
          description: `Payroll markup — SUI (2.5%) on $${(pr.gross_pay).toLocaleString()}`,
          tier_slug: "payroll_markup_sui",
          quantity: 1,
          unit_price_cents: suiMarkup,
          total_cents: suiMarkup,
          is_markup: true,
          markup_type: "sui",
          markup_rate: 0.025,
        });
      }
    }

    const subtotalCents = lineItems.filter(li => !li.is_markup).reduce((s, li) => s + li.total_cents, 0);
    const markupCents = lineItems.filter(li => li.is_markup).reduce((s, li) => s + li.total_cents, 0);
    const totalCents = subtotalCents + markupCents;

    // Generate invoice number
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${company_id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Insert invoice
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .insert({
        company_id,
        company_name: plan.company_id, // Will be overwritten below
        invoice_number: invoiceNumber,
        period_start,
        period_end,
        subtotal_cents: subtotalCents,
        markup_cents: markupCents,
        total_cents: totalCents,
        status: "draft",
        due_date,
      })
      .select()
      .single();

    if (invError) throw invError;
    logStep("Invoice created", { id: invoice.id, total: totalCents });

    // Insert line items
    const { error: liError } = await supabase
      .from("invoice_line_items")
      .insert(lineItems.map(li => ({ ...li, invoice_id: invoice.id })));

    if (liError) throw liError;

    // Insert payroll markups
    if (markupItems.length > 0) {
      const { error: mkError } = await supabase
        .from("payroll_markups")
        .insert(markupItems.map(m => ({
          ...m,
          invoice_id: invoice.id,
          general_markup_rate: 0.015,
          sui_markup_rate: 0.025,
        })));
      if (mkError) throw mkError;
    }

    // Optionally create Stripe invoice
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripeInvoiceId = null;

    if (stripeKey && plan.stripe_customer_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      for (const li of lineItems) {
        await stripe.invoiceItems.create({
          customer: plan.stripe_customer_id,
          amount: li.total_cents,
          currency: "usd",
          description: li.description,
        });
      }

      const stripeInvoice = await stripe.invoices.create({
        customer: plan.stripe_customer_id,
        auto_advance: false,
        collection_method: "send_invoice",
        days_until_due: 30,
      });

      stripeInvoiceId = stripeInvoice.id;

      await supabase
        .from("invoices")
        .update({ stripe_invoice_id: stripeInvoiceId })
        .eq("id", invoice.id);

      logStep("Stripe invoice created", { stripeInvoiceId });
    }

    return new Response(JSON.stringify({ invoice, stripe_invoice_id: stripeInvoiceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

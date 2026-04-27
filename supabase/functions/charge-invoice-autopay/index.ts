import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });

    const { data: invoice } = await supabase.from("invoices").select("*")
      .eq("id", invoice_id).single();
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ message: "Already paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const { data: bp } = await supabase.from("billing_profiles").select("*")
      .eq("company_id", invoice.company_id).maybeSingle();
    if (!bp?.autopay_enabled) {
      return new Response(JSON.stringify({ message: "Autopay disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    if (!bp.stripe_customer_id) throw new Error("No Stripe customer");

    const { data: pm } = await supabase.from("payment_methods").select("*")
      .eq("company_id", invoice.company_id).eq("is_default", true)
      .eq("status", "active").maybeSingle();
    if (!pm) throw new Error("No default payment method");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });

    let chargeStatus = "pending"; let errMsg: string | null = null; let intentId: string | null = null;
    try {
      const intent = await stripe.paymentIntents.create({
        amount: invoice.balance_due_cents,
        currency: "usd",
        customer: bp.stripe_customer_id,
        payment_method: pm.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Invoice ${invoice.invoice_number}`,
        metadata: { invoice_id, company_id: invoice.company_id, atlas_invoice: invoice.invoice_number },
      });
      intentId = intent.id;
      chargeStatus = intent.status === "succeeded" ? "paid" : "pending";
    } catch (stripeErr: any) {
      chargeStatus = "failed";
      errMsg = stripeErr?.message || String(stripeErr);
    }

    // Record attempt
    await supabase.from("payment_attempts").insert({
      invoice_id, company_id: invoice.company_id,
      method: pm.method_type === "card" ? "card" : "ach",
      amount_cents: invoice.balance_due_cents,
      status: chargeStatus === "paid" ? "succeeded" : chargeStatus,
      processor_response_message: errMsg,
      attempt_date: new Date().toISOString(),
    } as any);

    if (chargeStatus === "paid") {
      await supabase.from("invoices").update({
        status: "paid", paid_at: new Date().toISOString(),
        paid_amount_cents: invoice.total_cents, balance_due_cents: 0,
      } as any).eq("id", invoice_id);
      // AR
      await supabase.from("billing_profiles").update({
        current_ar_balance_cents: Math.max(0, (bp.current_ar_balance_cents || 0) - invoice.total_cents),
      } as any).eq("id", bp.id);
      await supabase.from("billing_activity_logs").insert({
        company_id: invoice.company_id, invoice_id, event_type: "autopay_succeeded",
        payload: { amount_cents: invoice.total_cents, payment_intent: intentId },
      } as any);
    } else if (chargeStatus === "failed") {
      await supabase.from("invoices").update({ status: "failed_payment" } as any).eq("id", invoice_id);
      await supabase.from("nsf_events").insert({
        company_id: invoice.company_id, invoice_id,
        amount_cents: invoice.balance_due_cents,
        failure_type: "autopay_decline", failure_code: "stripe_decline",
        notes: errMsg, status: "open", retry_eligible: true,
      } as any);
      await supabase.from("billing_activity_logs").insert({
        company_id: invoice.company_id, invoice_id, event_type: "autopay_failed",
        payload: { error: errMsg },
      } as any);
    }

    return new Response(JSON.stringify({ status: chargeStatus, error: errMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

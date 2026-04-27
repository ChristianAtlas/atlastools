import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });

    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body); // fallback for local/manual testing
    }

    console.log(`[STRIPE-WEBHOOK] ${event.type}`);

    const markPaid = async (invoiceId: string, amount: number, intentId: string) => {
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (!inv) return;
      if (inv.status === "paid") return;
      await supabase.from("invoices").update({
        status: "paid", paid_at: new Date().toISOString(),
        paid_amount_cents: inv.total_cents, balance_due_cents: 0,
      } as any).eq("id", invoiceId);
      await supabase.from("payment_attempts").insert({
        invoice_id: invoiceId, company_id: inv.company_id, method: "card",
        amount_cents: amount, status: "succeeded",
        processor_response_message: intentId, attempt_date: new Date().toISOString(),
      } as any);
      const { data: bp } = await supabase.from("billing_profiles").select("*").eq("company_id", inv.company_id).maybeSingle();
      if (bp) await supabase.from("billing_profiles").update({
        current_ar_balance_cents: Math.max(0, (bp.current_ar_balance_cents || 0) - inv.total_cents),
      } as any).eq("id", bp.id);
      await supabase.from("billing_activity_logs").insert({
        company_id: inv.company_id, invoice_id: invoiceId, event_type: "payment_succeeded",
        payload: { intent: intentId, amount },
      } as any);
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const invoiceId = s.metadata?.invoice_id;
        if (invoiceId && s.payment_status === "paid") {
          await markPaid(invoiceId, s.amount_total || 0, s.payment_intent as string);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoice_id;
        if (invoiceId) await markPaid(invoiceId, pi.amount, pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoice_id;
        if (invoiceId) {
          const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
          if (inv) {
            await supabase.from("invoices").update({ status: "failed_payment" } as any).eq("id", invoiceId);
            await supabase.from("nsf_events").insert({
              company_id: inv.company_id, invoice_id: invoiceId,
              amount_cents: pi.amount, status: "open",
              failure_type: "payment_failed",
              failure_code: pi.last_payment_error?.code,
              notes: pi.last_payment_error?.message, retry_eligible: true,
            } as any);
            await supabase.from("billing_activity_logs").insert({
              company_id: inv.company_id, invoice_id: invoiceId, event_type: "payment_failed",
              payload: { intent: pi.id, error: pi.last_payment_error?.message },
            } as any);
          }
        }
        break;
      }
      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;
        const companyId = si.metadata?.company_id;
        const pmId = si.payment_method as string;
        if (companyId && pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          const { count } = await supabase.from("payment_methods").select("*", { count: "exact", head: true })
            .eq("company_id", companyId);
          await supabase.from("payment_methods").insert({
            company_id: companyId,
            stripe_payment_method_id: pmId,
            stripe_customer_id: pm.customer as string,
            method_type: pm.type === "card" ? "card" : "us_bank_account",
            brand: pm.card?.brand || pm.us_bank_account?.bank_name,
            last4: pm.card?.last4 || pm.us_bank_account?.last4,
            exp_month: pm.card?.exp_month, exp_year: pm.card?.exp_year,
            bank_name: pm.us_bank_account?.bank_name,
            is_default: (count ?? 0) === 0,
          } as any);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    console.error("[STRIPE-WEBHOOK] error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});

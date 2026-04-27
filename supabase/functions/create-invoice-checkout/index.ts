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
    if (invoice.status === "paid") throw new Error("Invoice already paid");

    const { data: bp } = await supabase.from("billing_profiles").select("*")
      .eq("company_id", invoice.company_id).maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });

    let customerId = bp?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: bp?.billing_contact_email,
        name: bp?.legal_billing_name || invoice.company_name,
        metadata: { company_id: invoice.company_id },
      });
      customerId = customer.id;
      if (bp) await supabase.from("billing_profiles").update({ stripe_customer_id: customerId } as any).eq("id", bp.id);
    }

    const origin = req.headers.get("origin") || "https://atlasonepayroll.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card", "us_bank_account"],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: invoice.balance_due_cents,
          product_data: {
            name: `AtlasOne Invoice ${invoice.invoice_number}`,
            description: `${invoice.invoice_type === "payroll" ? "Payroll" : "Monthly Service"} invoice for ${invoice.company_name}`,
          },
        },
      }],
      success_url: `${origin}/invoices/${invoice_id}?payment=success`,
      cancel_url: `${origin}/invoices/${invoice_id}?payment=canceled`,
      metadata: { invoice_id, company_id: invoice.company_id },
    });

    await supabase.from("billing_activity_logs").insert({
      company_id: invoice.company_id, invoice_id, event_type: "checkout_session_created",
      payload: { session_id: session.id, amount: invoice.balance_due_cents },
    } as any);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

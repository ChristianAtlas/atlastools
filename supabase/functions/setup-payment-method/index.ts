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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Unauthorized");

    const { company_id } = await req.json();
    if (!company_id) throw new Error("company_id required");

    // Find or create Stripe customer for this company
    const { data: bp } = await supabase.from("billing_profiles").select("*")
      .eq("company_id", company_id).maybeSingle();

    let customerId = bp?.stripe_customer_id;
    if (!customerId) {
      const { data: company } = await supabase.from("companies").select("name")
        .eq("id", company_id).single();
      const customer = await stripe.customers.create({
        email: bp?.billing_contact_email || user.email,
        name: bp?.legal_billing_name || company?.name,
        metadata: { company_id, atlas_user_id: user.id },
      });
      customerId = customer.id;
      if (bp) {
        await supabase.from("billing_profiles").update({ stripe_customer_id: customerId } as any)
          .eq("id", bp.id);
      } else {
        await supabase.from("billing_profiles").insert({
          company_id, stripe_customer_id: customerId,
          billing_contact_email: user.email,
        } as any);
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card", "us_bank_account"],
      usage: "off_session",
      metadata: { company_id },
    });

    return new Response(JSON.stringify({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

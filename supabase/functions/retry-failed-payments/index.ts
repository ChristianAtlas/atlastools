import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });

    const { data: nsf } = await supabase.from("nsf_events")
      .select("*").eq("status", "open").eq("retry_eligible", true).lt("retry_count", 3);

    let retried = 0;
    for (const n of (nsf ?? [])) {
      if (!n.invoice_id) continue;
      try {
        await supabase.functions.invoke("charge-invoice-autopay", { body: { invoice_id: n.invoice_id } });
        await supabase.from("nsf_events").update({
          retry_count: (n.retry_count || 0) + 1,
          retry_scheduled_at: new Date().toISOString(),
        } as any).eq("id", n.id);
        retried++;
      } catch (e) {
        console.error("retry failed", n.id, e);
      }
    }
    return new Response(JSON.stringify({ retried, total: nsf?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

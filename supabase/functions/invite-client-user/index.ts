import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface InviteBody {
  email: string;
  full_name?: string;
  role: "client_admin" | "employee";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userRes.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).maybeSingle();
    const callerRole = (roleRow as any)?.role;
    if (callerRole !== "client_admin" && callerRole !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only client admins can invite users" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("profiles").select("company_id").eq("id", callerId).maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Caller has no company" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: InviteBody = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const role = body.role;
    const fullName = (body.full_name || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (role !== "client_admin" && role !== "employee") {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const redirectTo = `${req.headers.get("origin") || ""}/login`;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, company_id: companyId },
      redirectTo,
    });
    if (inviteErr || !invited?.user) {
      return new Response(JSON.stringify({ error: inviteErr?.message || "Invite failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = invited.user.id;

    await admin.from("profiles").update({ company_id: companyId, full_name: fullName || null }).eq("id", newUserId);
    await admin.from("user_roles").delete().eq("user_id", newUserId);
    await admin.from("user_roles").insert({ user_id: newUserId, role });

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

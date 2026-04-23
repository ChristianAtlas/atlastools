import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface InviteBody {
  vendor_id: string;
  email: string;
  full_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userRes.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    const callerRole = (roleRow as any)?.role;
    if (callerRole !== "client_admin" && callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can invite contractors" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: InviteBody = await req.json();
    const vendorId = (body.vendor_id || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const fullName = (body.full_name || "").trim();

    if (!vendorId) {
      return new Response(JSON.stringify({ error: "vendor_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vendor, error: vErr } = await admin
      .from("vendors")
      .select("id, company_id, legal_name, user_id")
      .eq("id", vendorId)
      .maybeSingle();
    if (vErr || !vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client admins can only invite contractors of their own company
    if (callerRole === "client_admin") {
      const { data: profile } = await admin
        .from("profiles")
        .select("company_id")
        .eq("id", callerId)
        .maybeSingle();
      if ((profile as any)?.company_id !== (vendor as any).company_id) {
        return new Response(
          JSON.stringify({ error: "Cannot invite contractor of another company" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if ((vendor as any).user_id) {
      return new Response(
        JSON.stringify({ error: "Vendor is already linked to a portal account" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const redirectTo = `${req.headers.get("origin") || ""}/login`;
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName || (vendor as any).legal_name,
          vendor_id: vendorId,
        },
        redirectTo,
      });
    if (inviteErr || !invited?.user) {
      return new Response(
        JSON.stringify({ error: inviteErr?.message || "Invite failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newUserId = invited.user.id;

    // Set role to contractor (handle_new_user trigger inserts 'employee' by default)
    await admin.from("user_roles").delete().eq("user_id", newUserId);
    await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "contractor" });

    await admin
      .from("profiles")
      .update({ full_name: fullName || (vendor as any).legal_name })
      .eq("id", newUserId);

    // Link vendor → user, mark portal access enabled, stamp invite time
    await admin
      .from("vendors")
      .update({
        user_id: newUserId,
        portal_access_enabled: true,
        portal_invited_at: new Date().toISOString(),
      })
      .eq("id", vendorId);

    return new Response(
      JSON.stringify({ ok: true, user_id: newUserId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
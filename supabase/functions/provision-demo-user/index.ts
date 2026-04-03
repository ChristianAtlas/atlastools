import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, company_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === email);

    if (existing) {
      // Ensure role is correct
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existing.id)
        .single();

      if (existingRole?.role !== role) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", existing.id);
      }

      // Ensure company_id is set
      if (company_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ company_id })
          .eq("id", existing.id);
      }

      return new Response(JSON.stringify({ ok: true, user_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new user
    const { data: newUser, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createErr) throw createErr;

    const userId = newUser.user.id;

    // Set role (handle_new_user trigger sets 'employee' by default, update if different)
    if (role !== "employee") {
      await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
    }

    // Set company_id on profile
    if (company_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ company_id, full_name })
        .eq("id", userId);
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

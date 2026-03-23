import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["companies"] or ["companies", "<id>"]
    const companyId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

    switch (req.method) {
      case "GET": {
        if (companyId) {
          const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyId)
            .is("deleted_at", null)
            .single();
          if (error) throw error;
          return json(data);
        }
        // List with optional filters
        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");
        let query = supabase
          .from("companies")
          .select("*")
          .is("deleted_at", null)
          .order("name");
        if (status) query = query.eq("status", status);
        if (search) query = query.ilike("name", `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "POST": {
        const body = await req.json();
        const { data, error } = await supabase
          .from("companies")
          .insert({
            name: body.name,
            legal_name: body.legal_name,
            ein: body.ein,
            status: body.status || "onboarding",
            address_line1: body.address_line1,
            address_line2: body.address_line2,
            city: body.city,
            state: body.state,
            zip: body.zip,
            primary_contact_name: body.primary_contact_name,
            primary_contact_email: body.primary_contact_email,
            primary_contact_phone: body.primary_contact_phone,
            settings: body.settings || {},
          })
          .select()
          .single();
        if (error) throw error;
        return json(data, 201);
      }

      case "PATCH": {
        if (!companyId) return json({ error: "Company ID required" }, 400);
        const body = await req.json();
        // Only allow known fields
        const allowed = [
          "name", "legal_name", "ein", "status",
          "address_line1", "address_line2", "city", "state", "zip",
          "primary_contact_name", "primary_contact_email", "primary_contact_phone",
          "settings", "employee_count",
        ];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
          if (key in body) updates[key] = body[key];
        }
        const { data, error } = await supabase
          .from("companies")
          .update(updates)
          .eq("id", companyId)
          .select()
          .single();
        if (error) throw error;
        return json(data);
      }

      case "DELETE": {
        if (!companyId) return json({ error: "Company ID required" }, 400);
        // Soft delete
        const { error } = await supabase
          .from("companies")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", companyId);
        if (error) throw error;
        return json({ success: true });
      }

      default:
        return json({ error: "Method not allowed" }, 405);
    }
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

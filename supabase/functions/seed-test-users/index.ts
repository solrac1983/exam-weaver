import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const users = [
      { email: "superadmin@provafacil.com", password: "Super@123", full_name: "Super Administrador", role: "super_admin" },
      { email: "admin@provafacil.com", password: "Admin@123", full_name: "Admin ProvaFácil", role: "admin" },
      { email: "coordenador@provafacil.com", password: "Coord@123", full_name: "Maria Coordenadora", role: "coordinator" },
      { email: "professor@provafacil.com", password: "Prof@123", full_name: "João Professor", role: "professor" },
    ];

    const results = [];

    for (const u of users) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);

      if (existing) {
        // Update role if needed
        await supabase
          .from("user_roles")
          .upsert({ user_id: existing.id, role: u.role }, { onConflict: "user_id" });
        results.push({ email: u.email, status: "already_exists", role: u.role });
        continue;
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (authError) {
        results.push({ email: u.email, status: "error", error: authError.message });
        continue;
      }

      // The handle_new_user trigger should create profile and default role.
      // Now update the role to the correct one.
      if (u.role !== "professor") {
        await supabase
          .from("user_roles")
          .update({ role: u.role })
          .eq("user_id", authData.user.id);
      }

      results.push({ email: u.email, password: u.password, status: "created", role: u.role });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const { data: callerRole } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (callerRole?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: only super admins" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, user_id, full_name, email, role, company_id, password } = await req.json();

    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: "Missing user_id or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent deleting/editing yourself
    if (user_id === callerId && action === "delete") {
      return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      // Update auth user email/password if changed
      const authUpdate: Record<string, unknown> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;

      // Validate password strength before sending to Supabase Auth
      if (password) {
        if (typeof password !== "string" || password.length < 8) {
          return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasUpper || !hasLower || !hasNumber) {
          return new Response(JSON.stringify({ error: "A senha deve conter ao menos uma letra maiúscula, uma minúscula e um número." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authErr } = await supabase.auth.admin.updateUserById(user_id, authUpdate);
        if (authErr) {
          const msg = authErr.message.toLowerCase();
          let friendly = authErr.message;
          if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised") || msg.includes("hibp")) {
            friendly = "Esta senha é considerada fraca ou foi exposta em vazamentos públicos. Escolha uma senha mais forte e única.";
          } else if (msg.includes("email")) {
            friendly = "Não foi possível atualizar o e-mail. Verifique se o endereço é válido e ainda não está em uso.";
          }
          return new Response(JSON.stringify({ error: friendly }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (email !== undefined) profileUpdate.email = email;
      if (company_id !== undefined) profileUpdate.company_id = company_id || null;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", user_id);
      }

      // Update role
      if (role) {
        await supabase.from("user_roles").update({ role }).eq("user_id", user_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      // Delete auth user (cascades to profiles and user_roles via FK)
      const { error: delErr } = await supabase.auth.admin.deleteUser(user_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Error contract (keep in sync with src/lib/manageUserErrors.ts) ----------
type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "MISSING_FIELDS"
  | "SELF_DELETE_FORBIDDEN"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_WEAK_COMPLEXITY"
  | "PASSWORD_LEAKED"
  | "EMAIL_INVALID_OR_TAKEN"
  | "AUTH_UPDATE_FAILED"
  | "PROFILE_UPDATE_FAILED"
  | "ROLE_UPDATE_FAILED"
  | "DELETE_FAILED"
  | "INVALID_ACTION"
  | "INTERNAL_ERROR";

const MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente para continuar.",
  FORBIDDEN: "Você não tem permissão para executar esta ação.",
  INVALID_INPUT: "Dados inválidos. Revise as informações e tente novamente.",
  MISSING_FIELDS: "Preencha todos os campos obrigatórios.",
  SELF_DELETE_FORBIDDEN: "Você não pode excluir a si mesmo.",
  PASSWORD_TOO_SHORT: "A senha deve ter no mínimo 8 caracteres.",
  PASSWORD_WEAK_COMPLEXITY: "A senha deve conter ao menos uma letra maiúscula, uma minúscula e um número.",
  PASSWORD_LEAKED: "Esta senha foi exposta em vazamentos públicos ou é muito comum. Escolha uma senha mais forte e única.",
  EMAIL_INVALID_OR_TAKEN: "Não foi possível atualizar o e-mail. Verifique se é válido e ainda não está em uso.",
  AUTH_UPDATE_FAILED: "Não foi possível atualizar as credenciais do usuário.",
  PROFILE_UPDATE_FAILED: "Não foi possível salvar os dados do perfil.",
  ROLE_UPDATE_FAILED: "Não foi possível atualizar o perfil de acesso.",
  DELETE_FAILED: "Não foi possível excluir o usuário. Tente novamente.",
  INVALID_ACTION: "Operação inválida.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado. Tente novamente em instantes.",
};

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  MISSING_FIELDS: 400,
  SELF_DELETE_FORBIDDEN: 400,
  PASSWORD_TOO_SHORT: 400,
  PASSWORD_WEAK_COMPLEXITY: 400,
  PASSWORD_LEAKED: 400,
  EMAIL_INVALID_OR_TAKEN: 400,
  AUTH_UPDATE_FAILED: 400,
  PROFILE_UPDATE_FAILED: 500,
  ROLE_UPDATE_FAILED: 500,
  DELETE_FAILED: 400,
  INVALID_ACTION: 400,
  INTERNAL_ERROR: 500,
};

function errorResponse(code: ErrorCode, opts?: { field?: string; messageOverride?: string; details?: unknown }) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message: opts?.messageOverride ?? MESSAGES[code],
        ...(opts?.field ? { field: opts.field } : {}),
        ...(opts?.details ? { details: opts.details } : {}),
      },
    }),
    { status: STATUS[code], headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function classifyAuthError(message: string): ErrorCode {
  const m = message.toLowerCase();
  if (m.includes("weak") || m.includes("pwned") || m.includes("compromised") || m.includes("hibp") || m.includes("known")) {
    return "PASSWORD_LEAKED";
  }
  if (m.includes("email")) return "EMAIL_INVALID_OR_TAKEN";
  return "AUTH_UPDATE_FAILED";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("UNAUTHORIZED");
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse("UNAUTHORIZED");
    }

    const callerId = claimsData.claims.sub;
    const { data: callerRole } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (callerRole?.role !== "super_admin") {
      return errorResponse("FORBIDDEN");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("INVALID_INPUT");
    }

    const { action, user_id, full_name, email, role, company_id, password } = body as {
      action?: string;
      user_id?: string;
      full_name?: string;
      email?: string;
      role?: string;
      company_id?: string | null;
      password?: string;
    };

    if (!user_id || !action) {
      return errorResponse("MISSING_FIELDS", { field: !user_id ? "user_id" : "action" });
    }

    if (user_id === callerId && action === "delete") {
      return errorResponse("SELF_DELETE_FORBIDDEN");
    }

    if (action === "update") {
      // Password validation up-front
      if (password !== undefined && password !== "") {
        if (typeof password !== "string" || password.length < 8) {
          return errorResponse("PASSWORD_TOO_SHORT", { field: "password" });
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasUpper || !hasLower || !hasNumber) {
          return errorResponse("PASSWORD_WEAK_COMPLEXITY", { field: "password" });
        }
      }

      const authUpdate: Record<string, unknown> = {};
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;

      if (Object.keys(authUpdate).length > 0) {
        const { error: authErr } = await supabase.auth.admin.updateUserById(user_id, authUpdate);
        if (authErr) {
          const code = classifyAuthError(authErr.message);
          return errorResponse(code, {
            field: code === "PASSWORD_LEAKED" || code === "AUTH_UPDATE_FAILED" ? "password" : "email",
          });
        }
      }

      const profileUpdate: Record<string, unknown> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (email !== undefined) profileUpdate.email = email;
      if (company_id !== undefined) profileUpdate.company_id = company_id || null;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profErr } = await supabase.from("profiles").update(profileUpdate).eq("id", user_id);
        if (profErr) return errorResponse("PROFILE_UPDATE_FAILED");
      }

      if (role) {
        const { error: roleErr } = await supabase.from("user_roles").update({ role }).eq("user_id", user_id);
        if (roleErr) return errorResponse("ROLE_UPDATE_FAILED");
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user_id);
      if (delErr) {
        return errorResponse("DELETE_FAILED", { messageOverride: delErr.message });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorResponse("INVALID_ACTION");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[manage-user] internal error:", msg);
    return errorResponse("INTERNAL_ERROR");
  }
});

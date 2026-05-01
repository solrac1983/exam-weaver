// Shared error contract for the `manage-user` edge function.
// Keep error codes in sync with `supabase/functions/manage-user/index.ts`.

export type ManageUserErrorCode =
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

export interface ManageUserErrorPayload {
  code: ManageUserErrorCode;
  message: string;     // user-friendly Portuguese message
  field?: string;      // optional field hint for forms
  details?: unknown;   // optional structured info (non-sensitive)
}

const FRIENDLY: Record<ManageUserErrorCode, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente para continuar.",
  FORBIDDEN: "Você não tem permissão para executar esta ação.",
  INVALID_INPUT: "Dados inválidos. Revise as informações e tente novamente.",
  MISSING_FIELDS: "Preencha todos os campos obrigatórios.",
  SELF_DELETE_FORBIDDEN: "Você não pode excluir a si mesmo.",
  PASSWORD_TOO_SHORT: "A senha deve ter no mínimo 8 caracteres.",
  PASSWORD_WEAK_COMPLEXITY:
    "A senha deve conter ao menos uma letra maiúscula, uma minúscula e um número.",
  PASSWORD_LEAKED:
    "Esta senha foi exposta em vazamentos públicos ou é muito comum. Escolha uma senha mais forte e única.",
  EMAIL_INVALID_OR_TAKEN:
    "Não foi possível atualizar o e-mail. Verifique se é válido e ainda não está em uso.",
  AUTH_UPDATE_FAILED: "Não foi possível atualizar as credenciais do usuário.",
  PROFILE_UPDATE_FAILED: "Não foi possível salvar os dados do perfil.",
  ROLE_UPDATE_FAILED: "Não foi possível atualizar o perfil de acesso.",
  DELETE_FAILED: "Não foi possível excluir o usuário. Tente novamente.",
  INVALID_ACTION: "Operação inválida.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado. Tente novamente em instantes.",
};

interface RawError {
  message?: string;
  error?: unknown;
  code?: string;
}

/**
 * Normalize anything returned by `supabase.functions.invoke('manage-user')`
 * (whether `error` from the SDK, `data.error`, raw string, or structured payload)
 * into a consistent { code, message } object.
 */
export function parseManageUserError(
  invokeError: unknown,
  responseData: unknown,
): ManageUserErrorPayload {
  // 1. Structured contract from the function body
  const payload = (responseData as { error?: unknown })?.error;
  if (payload && typeof payload === "object") {
    const p = payload as Partial<ManageUserErrorPayload>;
    if (p.code && FRIENDLY[p.code as ManageUserErrorCode]) {
      return {
        code: p.code as ManageUserErrorCode,
        message: p.message || FRIENDLY[p.code as ManageUserErrorCode],
        field: p.field,
        details: p.details,
      };
    }
  }

  // 2. Plain string error from data.error (legacy)
  if (typeof payload === "string" && payload.trim()) {
    return { code: "INTERNAL_ERROR", message: payload };
  }

  // 3. SDK invoke error
  const sdkMsg = (invokeError as RawError)?.message;
  if (sdkMsg) {
    const lower = sdkMsg.toLowerCase();
    if (lower.includes("weak") || lower.includes("pwned") || lower.includes("hibp")) {
      return { code: "PASSWORD_LEAKED", message: FRIENDLY.PASSWORD_LEAKED };
    }
    return { code: "INTERNAL_ERROR", message: sdkMsg };
  }

  return { code: "INTERNAL_ERROR", message: FRIENDLY.INTERNAL_ERROR };
}

export function getFriendlyManageUserMessage(code: ManageUserErrorCode): string {
  return FRIENDLY[code] ?? FRIENDLY.INTERNAL_ERROR;
}

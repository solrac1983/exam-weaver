import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseManageUserError, type ManageUserErrorPayload } from "@/lib/manageUserErrors";

/**
 * Shared helper for invoking Supabase Edge Functions with a unified
 * error/success toast pattern.
 *
 * Goals:
 * - Normalize the many ways an edge function can fail (SDK error,
 *   `data.error` string, structured `{ error: { code, message } }` contract).
 * - Provide consistent Portuguese messages across the app.
 * - Centralize toast styling so success/error always look the same.
 *
 * Usage:
 *   const { data, error } = await invokeFunction("generate-questions", {
 *     body: { ... },
 *     successMessage: "Questões geradas!",
 *     errorMessage: "Falha ao gerar questões.",
 *   });
 *   if (error) return; // toast already shown
 */

export interface InvokeOptions<TBody = unknown> {
  body?: TBody;
  /** Toast on success. Pass `false` to skip. */
  successMessage?: string | false;
  /** Fallback toast title on error. Specific server messages override this. */
  errorMessage?: string;
  /** Skip toast entirely on error (caller will handle). */
  silent?: boolean;
  /** Extra HTTP headers. */
  headers?: Record<string, string>;
}

export interface InvokeResult<TData> {
  data: TData | null;
  error: NormalizedInvokeError | null;
}

export interface NormalizedInvokeError {
  code: string;
  message: string;
  field?: string;
  raw?: unknown;
}

interface RawErr {
  message?: string;
  name?: string;
}

/** Map common SDK errors to friendly Portuguese messages. */
function normalize(
  fnName: string,
  invokeError: unknown,
  responseData: unknown,
  fallback: string,
): NormalizedInvokeError {
  // 1) Structured contract used by `manage-user` (and any other function
  //    that adopts `{ error: { code, message, field? } }`).
  const payload = (responseData as { error?: unknown })?.error;
  if (payload && typeof payload === "object") {
    const p = payload as Partial<ManageUserErrorPayload> & { code?: string; message?: string };
    if (p.code) {
      // Reuse manage-user friendly messages when the function name matches,
      // otherwise just use what the server sent.
      if (fnName === "manage-user") {
        const parsed = parseManageUserError(invokeError, responseData);
        return { code: parsed.code, message: parsed.message, field: parsed.field, raw: payload };
      }
      return {
        code: p.code,
        message: p.message || fallback,
        field: (p as { field?: string }).field,
        raw: payload,
      };
    }
  }

  // 2) Plain string `data.error` (legacy)
  if (typeof payload === "string" && payload.trim()) {
    return { code: "FUNCTION_ERROR", message: payload, raw: payload };
  }

  // 3) SDK FunctionsHttpError / network error
  const msg = (invokeError as RawErr)?.message;
  if (msg) {
    const lower = msg.toLowerCase();
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return { code: "NETWORK_ERROR", message: "Sem conexão com o servidor. Verifique sua internet e tente novamente.", raw: invokeError };
    }
    if (lower.includes("timeout")) {
      return { code: "TIMEOUT", message: "A operação demorou demais. Tente novamente.", raw: invokeError };
    }
    if (lower.includes("non-2xx") || lower.includes("status code")) {
      return { code: "HTTP_ERROR", message: fallback, raw: invokeError };
    }
    return { code: "FUNCTION_ERROR", message: msg, raw: invokeError };
  }

  return { code: "UNKNOWN", message: fallback, raw: invokeError };
}

/**
 * Show a standardized error toast.
 *
 * Accepts either a plain string message (simple UI errors) or a
 * `NormalizedInvokeError` returned by `invokeFunction` (server/SDK errors,
 * which include a technical code and optional field for support).
 */
export function showInvokeError(
  errOrMessage: NormalizedInvokeError | string,
  titleOrDescription?: string,
) {
  if (typeof errOrMessage === "string") {
    toast.error(errOrMessage, titleOrDescription ? { description: titleOrDescription } : undefined);
    return;
  }
  const err = errOrMessage;
  const title = titleOrDescription;
  toast.error(title ?? err.message, {
    description: title
      ? err.message
      : `Código: ${err.code}${err.field ? ` • Campo: ${err.field}` : ""}`,
  });
}

/** Show a standardized success toast. */
export function showInvokeSuccess(message: string, description?: string) {
  toast.success(message, description ? { description } : undefined);
}

export async function invokeFunction<TData = unknown, TBody = unknown>(
  functionName: string,
  options: InvokeOptions<TBody> = {},
): Promise<InvokeResult<TData>> {
  const fallback = options.errorMessage ?? "Não foi possível concluir a operação. Tente novamente.";
  try {
    const { data, error } = await supabase.functions.invoke<TData>(functionName, {
      body: options.body as Record<string, unknown> | undefined,
      headers: options.headers,
    });

    const hasDataError = data && typeof data === "object" && "error" in (data as object) && (data as { error?: unknown }).error;

    if (error || hasDataError) {
      const normalized = normalize(functionName, error, data, fallback);
      if (!options.silent) showInvokeError(normalized, options.errorMessage);
      return { data: null, error: normalized };
    }

    if (options.successMessage) {
      showInvokeSuccess(options.successMessage);
    }

    return { data: (data as TData) ?? null, error: null };
  } catch (e) {
    const normalized = normalize(functionName, e, null, fallback);
    if (!options.silent) showInvokeError(normalized, options.errorMessage);
    return { data: null, error: normalized };
  }
}

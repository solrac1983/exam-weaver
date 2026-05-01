import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_AHEAD_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Resolves a `chat-attachments` storage reference to a usable URL.
 * - Accepts either a raw storage path (`<conversationId>/<file>`) or a full URL.
 * - For storage paths, generates a signed URL (cached, with refresh-ahead).
 * - For legacy full URLs (old public bucket records), returns them unchanged.
 */
export async function getChatAttachmentUrl(
  pathOrUrl: string | null | undefined
): Promise<string | null> {
  if (!pathOrUrl) return null;

  // Legacy / external full URL — return as-is.
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const path = pathOrUrl.replace(/^\/+/, "");
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt - now > REFRESH_AHEAD_MS) {
    return cached.url;
  }

  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      console.error("[chatAttachments] failed to sign URL", path, error);
      return null;
    }
    cache.set(path, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_URL_TTL_SECONDS * 1000,
    });
    return data.signedUrl;
  })();

  inflight.set(path, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(path);
  }
}

/** Bulk-resolve storage references — returns a path→signedUrl map. */
export async function resolveChatAttachmentUrls(
  pathsOrUrls: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const unique = Array.from(
    new Set(pathsOrUrls.filter((v): v is string => !!v))
  );
  const entries = await Promise.all(
    unique.map(async (p) => [p, await getChatAttachmentUrl(p)] as const)
  );
  const out: Record<string, string> = {};
  for (const [k, v] of entries) if (v) out[k] = v;
  return out;
}

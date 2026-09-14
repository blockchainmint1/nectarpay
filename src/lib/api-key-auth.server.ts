// Bearer API-key authentication for the public v1 REST API.
// Server-only: loaded with a dynamic import inside route handlers.

import { apiJson } from "@/lib/public-api";

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface ApiKeyRow {
  id: string;
  store_id: string;
}

/**
 * Verifies `Authorization: Bearer sk_live_…` and returns the key row plus the
 * admin client. On failure the caller should return `result.error` verbatim.
 */
export async function authenticateApiKey(request: Request): Promise<
  | { error: Response }
  | {
      keyRow: ApiKeyRow;
      supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
    }
> {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(sk_(?:live|test)_[A-Za-z0-9_-]+)$/);
  if (!m) return { error: apiJson({ error: "Missing or malformed Authorization header." }, 401) };
  const fullKey = m[1];
  const prefix = fullKey.slice(0, 16);
  const keyHash = await sha256Hex(fullKey);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: keyRow } = await supabaseAdmin
    .from("api_keys")
    .select("id, store_id, secret_hash, revoked_at")
    .eq("prefix", prefix)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at || keyRow.secret_hash !== keyHash) {
    return {
      error: apiJson(
        {
          error:
            "Invalid API key. Keys authenticate only against https://app.nectar-pay.com — check your API base URL.",
          api_base: "https://app.nectar-pay.com",
        },
        401,
      ),
    };
  }

  await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  return { keyRow: { id: keyRow.id, store_id: keyRow.store_id }, supabaseAdmin };
}

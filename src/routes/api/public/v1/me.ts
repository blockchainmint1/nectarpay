// Merchant identity endpoint.
// GET /api/public/v1/me  — Bearer sk_(live|test)_<key>
// Returns lightweight identity so merchants can verify their API key works
// and is pointed at the correct Nectar.Pay account.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/v1/me")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          const m = auth.match(/^Bearer\s+(sk_(?:live|test)_[A-Za-z0-9_-]+)$/);
          if (!m) {
            return json({ error: "Missing or malformed Authorization header." }, 401);
          }
          const fullKey = m[1];
          const prefix = fullKey.slice(0, 16);
          const keyHash = await sha256Hex(fullKey);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: keyRow } = await supabaseAdmin
            .from("api_keys")
            .select("id, store_id, label, prefix, revoked_at, secret_hash, last_used_at, created_at")
            .eq("prefix", prefix)
            .maybeSingle();

          if (!keyRow || keyRow.secret_hash !== keyHash) {
            return json({ error: "Invalid API key." }, 401);
          }
          if (keyRow.revoked_at) {
            return json({ error: "API key has been revoked." }, 401);
          }

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, name, slug, fiat_currency, owner_user_id, webhook_url")
            .eq("id", keyRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          // Best-effort owner email; not fatal if missing.
          let ownerEmail: string | null = null;
          if (store.owner_user_id) {
            const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(
              store.owner_user_id,
            );
            ownerEmail = userRes?.user?.email ?? null;
          }

          // Touch last_used_at so this counts as a real key usage.
          await supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          return json({
            ok: true,
            provider: "nectar.pay",
            api_version: "v1",
            key: {
              id: keyRow.id,
              label: keyRow.label,
              prefix: keyRow.prefix,
              mode: prefix.startsWith("sk_live_") ? "live" : "test",
              created_at: keyRow.created_at,
              last_used_at: keyRow.last_used_at,
            },
            merchant: {
              store_id: store.id,
              store_name: store.name,
              store_slug: store.slug,
              fiat_currency: store.fiat_currency,
              owner_email: ownerEmail,
              webhook_url: store.webhook_url ?? null,
            },
          });
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "Server error" },
            500,
          );
        }
      },
    },
  },
});

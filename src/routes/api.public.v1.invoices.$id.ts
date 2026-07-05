// Public invoice status endpoint.
// GET  /api/public/v1/invoices/{id}                 -> JSON invoice status
// POST /api/public/v1/invoices/{id}/redeliver-webhook (via ?action=redeliver-webhook)
// Auth: Bearer sk_(live|test)_<prefix>_<secret>, scoped to the invoice's store.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticate(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(sk_(?:live|test)_[A-Za-z0-9_-]+)$/);
  if (!m) return { error: json({ error: "Missing or malformed Authorization header." }, 401) };
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
    return { error: json({ error: "Invalid API key." }, 401) };
  }
  return { keyRow, supabaseAdmin };
}

export const Route = createFileRoute("/api/public/v1/invoices/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request, params }) => {
        try {
          const auth = await authenticate(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: inv, error } = await supabaseAdmin
            .from("invoices")
            .select(
              "id, store_id, chain, status, fiat_amount, fiat_currency, crypto_amount, rate, address, expires_at, created_at, external_order_id, description, redirect_url, buyer_email",
            )
            .eq("id", params.id)
            .maybeSingle();
          if (error) return json({ error: error.message }, 500);
          if (!inv || inv.store_id !== keyRow.store_id) {
            return json({ error: "Invoice not found." }, 404);
          }

          const origin = new URL(request.url).origin;
          return json({
            id: inv.id,
            status: inv.status,
            chain: inv.chain,
            fiat_amount: Number(inv.fiat_amount),
            fiat_currency: inv.fiat_currency,
            crypto_amount: inv.crypto_amount == null ? null : Number(inv.crypto_amount),
            rate: inv.rate == null ? null : Number(inv.rate),
            address: inv.address,
            expires_at: inv.expires_at,
            created_at: inv.created_at,
            order_id: inv.external_order_id,
            description: inv.description,
            redirect_url: inv.redirect_url,
            buyer_email: inv.buyer_email,
            checkout_url: `${origin}/i/${inv.id}`,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },

      POST: async ({ request, params }) => {
        // Merchant-triggered webhook redelivery for a single invoice.
        // Use: POST /api/public/v1/invoices/{id}?action=redeliver-webhook
        try {
          const url = new URL(request.url);
          const action = url.searchParams.get("action");
          if (action !== "redeliver-webhook") {
            return json({ error: "Unknown action. Use ?action=redeliver-webhook" }, 400);
          }

          const auth = await authenticate(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select(
              "id, store_id, chain, address, fiat_amount, fiat_currency, status, external_order_id, stores(webhook_url, webhook_secret)",
            )
            .eq("id", params.id)
            .maybeSingle();
          if (!inv || inv.store_id !== keyRow.store_id) {
            return json({ error: "Invoice not found." }, 404);
          }
          const store = inv.stores as { webhook_url: string | null; webhook_secret: string | null } | null;
          if (!store?.webhook_url || !store.webhook_secret) {
            return json({ error: "Store has no webhook configured." }, 400);
          }
          if (!["confirmed", "underpaid"].includes(inv.status)) {
            return json({ error: `Invoice status is '${inv.status}'; nothing to redeliver.` }, 400);
          }

          const { deliverWebhook } = await import("@/lib/webhooks.server");
          const eventType = inv.status === "confirmed" ? "invoice.paid" : "invoice.underpaid";
          const eventId = (crypto as { randomUUID: () => string }).randomUUID();
          const result = await deliverWebhook({
            url: store.webhook_url,
            secret: store.webhook_secret,
            event: {
              id: eventId,
              type: eventType,
              created_at: new Date().toISOString(),
              data: {
                invoice_id: inv.id,
                store_id: inv.store_id,
                status: inv.status,
                chain: (inv.chain ?? "") as string,
                address: inv.address,
                fiat_amount: Number(inv.fiat_amount),
                fiat_currency: inv.fiat_currency,
                paid_amount_usd: Number(inv.fiat_amount),
                order_id: inv.external_order_id ?? null,
              },
            },
          });
          return json({ ok: result.ok, status: result.status ?? null, error: result.error ?? null, event_id: eventId });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});

// Payment lookup endpoint — "did we actually get the money?"
//
// GET /api/public/v1/lookup?address=<addr>
// GET /api/public/v1/lookup?txid=<txid>
// GET /api/public/v1/lookup?invoice_id=<uuid>
// GET /api/public/v1/lookup?order_id=<external order id>
// Auth: Bearer sk_(live|test)_...  — everything is scoped to that key's store.
//
// Security notes:
//  - Server-to-server only: no CORS headers, so a browser cannot be tricked
//    into calling this with a leaked secret key from a third-party page.
//  - Every query is filtered by the API key's store_id. Addresses / txids that
//    belong to another merchant answer `found: false` — never another store's data.
//  - Constant-shape errors; no store or invoice details are leaked before auth.

import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
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
    return {
      error: json(
        {
          error:
            "Invalid API key. Keys authenticate only against https://app.nectar-pay.com — check your API base URL.",
          api_base: "https://app.nectar-pay.com",
        },
        401,
      ),
    };
  }
  return { keyRow, supabaseAdmin };
}

type Payment = {
  txid: string;
  amount: number | null;
  token_symbol: string | null;
  confirmations: number;
  seen_at: string | null;
  status: "confirmed" | "pending";
};

export const Route = createFileRoute("/api/public/v1/lookup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await authenticate(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;
          const storeId = keyRow.store_id;

          const url = new URL(request.url);
          const origin = `${url.protocol}//${url.host}`;
          const address = (url.searchParams.get("address") || "").trim();
          const txid = (url.searchParams.get("txid") || "").trim();
          const invoiceId = (url.searchParams.get("invoice_id") || "").trim();
          const orderId = (url.searchParams.get("order_id") || "").trim();

          if (!address && !txid && !invoiceId && !orderId) {
            return json(
              { error: "Provide one of: address, txid, invoice_id, order_id." },
              400,
            );
          }

          // Touch key usage (best effort).
          void supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id);

          const INVOICE_COLS =
            "id, store_id, status, chain, address, address_index, derivation_index, fiat_amount, fiat_currency, crypto_amount, token_symbol, external_order_id, created_at, expires_at";

          let invoice: Record<string, unknown> | null = null;
          let resolvedAddress: string | null = address || null;
          let resolvedChain: string | null = null;
          let ours: boolean | null = null;
          let derivationIndex: number | null = null;
          let note: string | null = null;
          const payments: Payment[] = [];

          const pushPayments = async (invId: string) => {
            const { data: txs } = await supabaseAdmin
              .from("transactions")
              .select("tx_hash, amount, token_symbol, confirmations, first_seen_at, confirmed_at")
              .eq("invoice_id", invId)
              .order("first_seen_at", { ascending: true })
              .limit(50);
            for (const t of txs ?? []) {
              payments.push({
                txid: t.tx_hash,
                amount: t.amount === null ? null : Number(t.amount),
                token_symbol: t.token_symbol ?? null,
                confirmations: t.confirmations ?? 0,
                seen_at: t.confirmed_at ?? t.first_seen_at ?? null,
                status: t.confirmed_at ? "confirmed" : "pending",
              });
            }
          };

          // ---------- resolve the invoice ----------
          if (invoiceId) {
            const { data } = await supabaseAdmin
              .from("invoices")
              .select(INVOICE_COLS)
              .eq("id", invoiceId)
              .eq("store_id", storeId)
              .maybeSingle();
            invoice = data ?? null;
          } else if (orderId) {
            const { data } = await supabaseAdmin
              .from("invoices")
              .select(INVOICE_COLS)
              .eq("store_id", storeId)
              .eq("external_order_id", orderId)
              .order("created_at", { ascending: false })
              .limit(1);
            invoice = data?.[0] ?? null;
          } else if (address) {
            const { data } = await supabaseAdmin
              .from("invoices")
              .select(INVOICE_COLS)
              .eq("store_id", storeId)
              .eq("address", address)
              .order("created_at", { ascending: false })
              .limit(1);
            invoice = data?.[0] ?? null;
          } else if (txid) {
            // Find our transaction row, then join back to the invoice (store-scoped).
            const { data: txs } = await supabaseAdmin
              .from("transactions")
              .select("tx_hash, amount, token_symbol, confirmations, first_seen_at, confirmed_at, invoice_id")
              .ilike("tx_hash", txid)
              .limit(20);
            for (const t of txs ?? []) {
              const { data: inv } = await supabaseAdmin
                .from("invoices")
                .select(INVOICE_COLS)
                .eq("id", t.invoice_id)
                .eq("store_id", storeId)
                .maybeSingle();
              if (!inv) continue; // another merchant's tx — stays invisible
              invoice = inv;
              payments.push({
                txid: t.tx_hash,
                amount: t.amount === null ? null : Number(t.amount),
                token_symbol: t.token_symbol ?? null,
                confirmations: t.confirmations ?? 0,
                seen_at: t.confirmed_at ?? t.first_seen_at ?? null,
                status: t.confirmed_at ? "confirmed" : "pending",
              });
              break;
            }
          }

          if (invoice) {
            resolvedAddress = (invoice['address'] as string | null) ?? resolvedAddress;
            resolvedChain = (invoice['chain'] as string | null) ?? null;
            ours = true;
            derivationIndex =
              (invoice['derivation_index'] as number | null) ??
              (invoice['address_index'] as number | null) ??
              null;
            if (payments.length === 0) await pushPayments(invoice['id'] as string);
          }

          // ---------- ownership check for an address with no invoice ----------
          if (!invoice && address) {
            const { runVerify } = await import("@/lib/address-verify.server");
            const verdict = await runVerify(address, [storeId]);
            const owned = verdict.matches.find((m) => m.store_id === storeId);
            if (owned) {
              ours = true;
              resolvedChain = owned.chain ?? null;
              derivationIndex = owned.derivation_index ?? null;
              note =
                "Address belongs to this store but no invoice used it — likely an off-process or reused-address payment.";
              // Surface any recorded payments that landed on this address.
              const { data: invs } = await supabaseAdmin
                .from("invoices")
                .select("id")
                .eq("store_id", storeId)
                .eq("address", address)
                .limit(5);
              for (const i of invs ?? []) await pushPayments(i.id);
            } else {
              ours = false;
              note =
                "This address does not derive from any wallet linked to this store. Funds sent here were not received by this merchant.";
            }
            // On-chain credits, when the verifier could read the chain.
            if (verdict.onchain) {
              resolvedChain = resolvedChain ?? verdict.onchain.chain;
              for (const c of verdict.onchain.credits) {
                if (payments.some((p) => p.txid === c.txid)) continue;
                payments.push({
                  txid: c.txid,
                  amount: Number(c.amount),
                  token_symbol: null,
                  confirmations: c.confirmations,
                  seen_at: null,
                  status: c.confirmations > 0 ? "confirmed" : "pending",
                });
              }
            }
          }

          if (!invoice && txid && payments.length === 0) {
            note = "No transaction with that id has been recorded against this store.";
          }

          const found = Boolean(invoice) || payments.length > 0 || ours === true;

          return json({
            found,
            address: resolvedAddress,
            chain: resolvedChain,
            ours,
            derivation_index: derivationIndex,
            invoice: invoice
              ? {
                  id: invoice['id'],
                  status: invoice['status'],
                  fiat_amount:
                    invoice['fiat_amount'] === null ? null : Number(invoice['fiat_amount']),
                  fiat_currency: invoice['fiat_currency'],
                  crypto_amount:
                    invoice['crypto_amount'] === null ? null : Number(invoice['crypto_amount']),
                  token_symbol: invoice['token_symbol'] ?? null,
                  order_id: invoice['external_order_id'] ?? null,
                  created_at: invoice['created_at'],
                  expires_at: invoice['expires_at'],
                  checkout_url: `${origin}/i/${invoice['id']}`,
                }
              : null,
            payments,
            note,
          });
        } catch (e) {
          console.error("[api/public/v1/lookup] error", e);
          return json({ error: "Internal error." }, 500);
        }
      },
    },
  },
});

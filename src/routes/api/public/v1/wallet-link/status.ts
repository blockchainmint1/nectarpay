// Wallet Link Status — read-only pre-flight check for the Beekeeper / Nectar
// wallet: "is this seed already linked to any NectarPay merchant stores?"
//
// WIRE FORMAT
//
//   POST /api/public/v1/wallet-link/status
//     {
//       "payload": { "v": 1, "type": "hm-link-status",
//                    "nonce": "<random>", "issued_at": "2026-08-31T06:55:00.000Z" },
//       "signature": "<base64 BIP-137>",
//       "address":   "<TXC base58 P2PKH, version 0x42>"
//     }
//     ← { linked: true, stores: [{ store_id, merchant_name,
//          chains_linked, linked_at }] }
//     (first store also flattened to top level for simple consumers)
//
// SECURITY
//   - Same signing recipe as /api/public/v1/wallet-link (canonicalJson of the
//     payload, sha256d magic-prefix, secp256k1 recoverable, TXC P2PKH v0x42).
//   - The signature is the authentication: only the seed holder can query
//     their own linkage. No token, no leak.
//   - issued_at must be within ±5 minutes of server time. A captured signed
//     message therefore expires quickly; the nonce makes every signed message
//     unique so wallets never accidentally reuse one.
//   - "linked" means: this signing address is registered to a NectarPay user
//     AND that user has consumed ≥1 wallet-link code (i.e. actually pushed
//     xpubs to a store). Registration alone returns linked:false with
//     registered:true so the wallet can distinguish "known signer, no stores"
//     from "never seen".

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyTxcSignature } from "@/lib/wallet-signature.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const PayloadSchema = z.object({
  v: z.literal(1),
  type: z.literal("hm-link-status"),
  nonce: z.string().min(8).max(128),
  issued_at: z.string().min(10).max(40),
});

const SubmitBody = z.object({
  payload: PayloadSchema,
  signature: z.string().min(40).max(200),
  address: z.string().min(20).max(80),
});

// Must match canonicalize() in ../wallet-link.ts byte-for-byte.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

// DB chain enum → uppercase wire key (inverse of WIRE_TO_DB in wallet-link.ts).
const DB_TO_WIRE: Record<string, string> = {
  btc: "BTC",
  txc: "TXC",
  eth: "EVM",
  ltc: "LTC",
  bch: "BCH",
  doge: "DOGE",
  dash: "DASH",
  tron: "TRX",
};

const ISSUED_AT_TOLERANCE_MS = 5 * 60_000;

export const Route = createFileRoute("/api/public/v1/wallet-link/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parse = SubmitBody.safeParse(raw);
          if (!parse.success) {
            return json({ error: "Bad request body.", details: parse.error.flatten() }, 400);
          }
          const { payload, signature, address } = parse.data;

          // 1. Freshness — the only replay defense available without storing
          //    nonces, and cheap. Wallets should sign right before sending.
          const issuedAt = Date.parse(payload.issued_at);
          if (Number.isNaN(issuedAt)) return json({ error: "Bad issued_at." }, 400);
          if (Math.abs(Date.now() - issuedAt) > ISSUED_AT_TOLERANCE_MS) {
            return json({ error: "Stale or future-dated payload. Re-sign and retry." }, 410);
          }

          // 2. Signature proves the caller holds this seed.
          const sigOk = verifyTxcSignature({
            address,
            message: canonicalize(payload),
            signature,
          });
          if (!sigOk) return json({ error: "Invalid signature." }, 401);

          // 3. Is this address registered to a NectarPay user?
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: acct } = await supabaseAdmin
            .from("wallet_accounts")
            .select("user_id")
            .eq("wallet_address", address.trim())
            .order("first_seen_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!acct) {
            return json({ linked: false, registered: false, stores: [] });
          }

          // 4. Which stores did that user actually push xpubs into?
          //    A consumed link code (used_at set) == a completed xpub push.
          const { data: codes } = await supabaseAdmin
            .from("wallet_link_codes")
            .select("store_id, used_at")
            .eq("created_by", acct.user_id)
            .not("used_at", "is", null)
            .order("used_at", { ascending: true });

          const storeIds = Array.from(new Set((codes ?? []).map((c) => c.store_id)));
          if (storeIds.length === 0) {
            return json({ linked: false, registered: true, stores: [] });
          }

          const [{ data: stores }, { data: configs }] = await Promise.all([
            supabaseAdmin.from("stores").select("id, name").in("id", storeIds),
            supabaseAdmin
              .from("chain_configs")
              .select("store_id, chain")
              .in("store_id", storeIds)
              .not("xpub", "is", null),
          ]);

          const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
          const chainsByStore = new Map<string, string[]>();
          for (const c of configs ?? []) {
            const wire = DB_TO_WIRE[c.chain];
            if (!wire) continue;
            const list = chainsByStore.get(c.store_id) ?? [];
            if (!list.includes(wire)) list.push(wire);
            chainsByStore.set(c.store_id, list);
          }

          const firstUseByStore = new Map<string, string>();
          for (const c of codes ?? []) {
            if (c.used_at && !firstUseByStore.has(c.store_id)) {
              firstUseByStore.set(c.store_id, c.used_at);
            }
          }

          const result = storeIds
            .filter((id) => storeName.has(id))
            .map((id) => ({
              store_id: id,
              merchant_name: storeName.get(id)!,
              chains_linked: chainsByStore.get(id) ?? [],
              linked_at: firstUseByStore.get(id) ?? null,
            }));

          const first = result[0];
          return json({
            linked: true,
            registered: true,
            // Convenience flattening of the first store for simple consumers.
            store_id: first?.store_id,
            merchant_name: first?.merchant_name,
            chains_linked: first?.chains_linked,
            linked_at: first?.linked_at,
            stores: result,
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

// Wallet Link — HTTPS-only handshake between the Bee Keeper / Nectar wallet
// and a NectarPay merchant store.
//
// WIRE FORMAT (locked with the wallet team)
//
//   GET /api/public/v1/wallet-link?token=<token>
//     → manifest { v, type:"hm-link-manifest", challenge_id, callback_url,
//                  from, merchant, chains, exp, issued_at, signing }
//
//   POST /api/public/v1/wallet-link
//     {
//       "payload": {
//         "v": 1, "type": "hm-link-xpubs",
//         "challenge_id": "...", "from": "nectar-pay.com",
//         "callback_url": "https://nectar-pay.com/api/public/v1/wallet-link?token=...",
//         "chains": ["BTC","TXC","EVM","LTC","BCH","TRX"],
//         "xpubs": { "BTC":"zpub...", "TXC":"xpub...", "EVM":"xpub...",
//                    "LTC":"...", "BCH":"...", "TRX":"<hex pubkey>" },
//         "exp": 1735689600,                         // unix SECONDS
//         "issued_at": "2026-06-24T18:32:01.234Z"
//       },
//       "signature": "<base64 BIP-137>",
//       "address":   "<TXC base58 P2PKH, version 0x42>"
//     }
//     ← { ok: true, store_id, merchant_name, chains_linked: ["BTC",...] }
//
// SIGNING
//   curve     : secp256k1
//   address   : TXC mainnet legacy P2PKH (base58check, version 0x42)
//               derived from m/44'/696969'/0'/0/0
//   message   : UTF-8 bytes of canonicalJson(payload)
//               (object keys sorted recursively, no whitespace)
//   signature : BIP-137 compact recoverable, base64
//   prefix    : "TEXITcoin Signed Message:\n"
//   verify    : double-sha256 magic-prefixed; we use the in-house
//               @noble/secp256k1 verifier (verifyTxcSignature).
//
// SECURITY
//   - challenge_id is a one-time bearer, sha256-hashed at rest, 5-min TTL.
//   - All envelope fields (challenge_id, callback_url, from, chains, exp,
//     issued_at, xpubs) live INSIDE the signed payload — strip/replay fails.
//   - Signing address must already be registered to the token issuer
//     (wallet_accounts.user_id = wallet_link_codes.created_by).
//   - chain_configs.enabled is never auto-flipped; merchant reviews.
//   - The audit trigger on chain_configs logs every xpub change; xpub-alert
//     cron Telegram-pings the merchant on any drift.

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { isXpubLike } from "@/lib/chains/derive.server";
import { verifyTxcSignature } from "@/lib/wallet-signature.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Uppercase wire-protocol chain keys (wallet side).
const WIRE_CHAINS = ["BTC", "TXC", "EVM", "LTC", "BCH", "DOGE", "TRX"] as const;
type WireChain = (typeof WIRE_CHAINS)[number];

// Map wire-protocol key → chain_configs.chain enum value (lowercase, EVM → eth).
const WIRE_TO_DB: Record<WireChain, "btc" | "txc" | "eth" | "ltc" | "bch" | "doge" | "tron"> = {
  BTC: "btc",
  TXC: "txc",
  EVM: "eth",
  LTC: "ltc",
  BCH: "bch",
  DOGE: "doge",
  TRX: "tron",
};

const PayloadSchema = z.object({
  v: z.literal(1),
  type: z.literal("hm-link-xpubs"),
  challenge_id: z.string().min(8).max(128),
  from: z.string().min(1).max(253),
  callback_url: z.string().url(),
  chains: z.array(z.enum(WIRE_CHAINS)).min(1),
  // TRX is a hex pubkey, others are xpub-like strings. Validate length loosely;
  // per-chain shape check happens below.
  xpubs: z.record(z.enum(WIRE_CHAINS), z.string().min(40).max(200)),
  exp: z.number().int().positive(), // unix SECONDS
  issued_at: z.string().min(10).max(40),
});

const SubmitBody = z.object({
  payload: PayloadSchema,
  signature: z.string().min(40).max(200),
  address: z.string().min(20).max(80),
});

// Canonical JSON: recursively sort object keys ascending, no whitespace,
// arrays preserved in order. Must match the wallet's canonicalJson() byte-for-byte.
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

function isTrxPubkeyHex(s: string): boolean {
  // Tron uses an uncompressed secp256k1 pubkey (65 bytes = 130 hex chars,
  // optional 0x04 prefix), or a compressed 33-byte form (66 hex chars).
  const v = s.trim().replace(/^0x/i, "");
  return /^[0-9a-fA-F]+$/.test(v) && (v.length === 66 || v.length === 128 || v.length === 130);
}

function extractTokenFromCallback(callbackUrl: string, expectedOrigin: string): string | null {
  try {
    const parsed = new URL(callbackUrl);
    if (parsed.origin !== expectedOrigin) return null;
    if (parsed.pathname !== "/api/public/v1/wallet-link") return null;
    return parsed.searchParams.get("token")?.trim() || null;
  } catch {
    return null;
  }
}

function manifestFor(opts: {
  token: string;
  origin: string;
  host: string;
  storeName: string;
  expiresAtIso: string;
}) {
  return {
    v: 1,
    type: "hm-link-manifest",
    challenge_id: opts.token,
    callback_url: `${opts.origin}/api/public/v1/wallet-link?token=${encodeURIComponent(opts.token)}`,
    from: opts.host,
    merchant: opts.storeName,
    chains: WIRE_CHAINS,
    exp: Math.floor(new Date(opts.expiresAtIso).getTime() / 1000), // unix SECONDS
    issued_at: new Date().toISOString(),
    signing: {
      curve: "secp256k1",
      hash: "sha256d-magic",
      prefix: "TEXITcoin Signed Message:\n",
      encoding: "base64",
      sig_format: "BIP-137 compact recoverable",
      key: "txc-account",
      address_format: "p2pkh-base58check-v0x42",
      derivation: "m/44'/696969'/0'/0/0",
      message: "UTF-8 bytes of canonicalJson(payload), keys sorted recursively, no whitespace",
      signed_fields: [
        "v",
        "type",
        "challenge_id",
        "from",
        "callback_url",
        "chains",
        "xpubs",
        "exp",
        "issued_at",
      ],
    },
  };
}

export const Route = createFileRoute("/api/public/v1/wallet-link")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const token = (url.searchParams.get("token") ?? "").trim();
          if (!token) return json({ error: "Missing token." }, 400);

          const code_hash = createHash("sha256").update(token).digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: codeRow } = await supabaseAdmin
            .from("wallet_link_codes")
            .select("id, store_id, expires_at, used_at")
            .eq("code_hash", code_hash)
            .maybeSingle();
          if (!codeRow) return json({ error: "Unknown link token." }, 404);
          if (codeRow.used_at) return json({ error: "Token already used." }, 410);
          if (new Date(codeRow.expires_at).getTime() < Date.now()) {
            return json({ error: "Token expired." }, 410);
          }

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, name")
            .eq("id", codeRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          return json(
            manifestFor({
              token,
              origin: url.origin,
              host: url.host,
              storeName: store.name,
              expiresAtIso: codeRow.expires_at,
            }),
          );
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : "Server error" },
            500,
          );
        }
      },

      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parse = SubmitBody.safeParse(raw);
          if (!parse.success) {
            console.warn("[wallet-link POST] schema reject", {
              raw_keys: raw && typeof raw === "object" ? Object.keys(raw) : null,
              payload_keys:
                raw && typeof raw === "object" && raw && (raw as Record<string, unknown>).payload && typeof (raw as Record<string, unknown>).payload === "object"
                  ? Object.keys((raw as { payload: Record<string, unknown> }).payload)
                  : null,
              issues: parse.error.flatten(),
            });
            return json({ error: "Bad request body.", details: parse.error.flatten() }, 400);
          }
          const { payload, signature, address } = parse.data;

          // 1. Token lookup. Beekeeper sends a wallet-side UUID as challenge_id
          // and keeps our one-time bearer in the signed callback_url query.
          const url = new URL(request.url);
          const callbackToken = extractTokenFromCallback(payload.callback_url, url.origin);
          const lookupToken = callbackToken ?? payload.challenge_id;
          const code_hash = createHash("sha256").update(lookupToken).digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: codeRow } = await supabaseAdmin
            .from("wallet_link_codes")
            .select("id, store_id, expires_at, used_at, created_by")
            .eq("code_hash", code_hash)
            .maybeSingle();
          if (!codeRow) {
            console.warn("[wallet-link POST] unknown token", {
              challenge_id_len: payload.challenge_id.length,
              challenge_id_prefix: payload.challenge_id.slice(0, 8),
              challenge_id_suffix: payload.challenge_id.slice(-4),
              token_source: callbackToken ? "callback_url" : "challenge_id",
              hash_prefix: code_hash.slice(0, 12),
              from: payload.from,
              callback_path: (() => {
                try {
                  const parsed = new URL(payload.callback_url);
                  return parsed.pathname;
                } catch {
                  return "invalid";
                }
              })(),
            });
            return json({ error: "Unknown link token." }, 404);
          }
          if (codeRow.used_at) return json({ error: "Token already used." }, 410);
          if (new Date(codeRow.expires_at).getTime() < Date.now()) {
            return json({ error: "Token expired." }, 410);
          }


          // 2. Envelope sanity — must match what the manifest advertised.
          const expectedCallback = `${url.origin}/api/public/v1/wallet-link`;
          const expectedCallbackWithToken = `${expectedCallback}?token=${encodeURIComponent(lookupToken)}`;
          if (payload.callback_url !== expectedCallback && payload.callback_url !== expectedCallbackWithToken) {
            return json({ error: "callback_url mismatch." }, 400);
          }
          if (payload.from !== url.host) {
            return json({ error: "from mismatch." }, 400);
          }
          if (payload.exp * 1000 < Date.now()) {
            return json({ error: "Signed payload expired." }, 410);
          }

          // 3. Signature check — address must be registered to the token issuer.
          const { data: addrRows } = await supabaseAdmin
            .from("wallet_accounts")
            .select("wallet_address")
            .eq("user_id", codeRow.created_by);
          const allowed = new Set(
            (addrRows ?? []).map((r) => r.wallet_address.trim().toLowerCase()),
          );
          if (!allowed.has(address.trim().toLowerCase())) {
            return json({ error: "Signing address not registered to this merchant." }, 403);
          }

          const message = canonicalize(payload);
          const sigOk = verifyTxcSignature({ address, message, signature });
          if (!sigOk) return json({ error: "Invalid signature." }, 401);

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, name")
            .eq("id", codeRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          // 4. Per-chain validate + upsert chain_configs.
          const chainsLinked: WireChain[] = [];
          const rejected: { chain: WireChain; reason: string }[] = [];

          for (const wireKey of WIRE_CHAINS) {
            const xpub = payload.xpubs[wireKey];
            if (!xpub) continue;
            const v = xpub.trim();

            // Per-chain shape check. TRX is a raw pubkey hex; others are xpub-like.
            const shapeOk = wireKey === "TRX" ? isTrxPubkeyHex(v) : isXpubLike(v);
            if (!shapeOk) {
              rejected.push({ chain: wireKey, reason: "Invalid key format." });
              continue;
            }

            const dbChain = WIRE_TO_DB[wireKey];
            const { data: existing } = await supabaseAdmin
              .from("chain_configs")
              .select("id, enabled, stables")
              .eq("store_id", store.id)
              .eq("chain", dbChain)
              .maybeSingle();

            const row = {
              store_id: store.id,
              chain: dbChain,
              network: "mainnet",
              xpub: v,
              xpub_or_address: v,
              derivation_path: null,
              enabled: existing?.enabled ?? false,
              stables: existing?.stables ?? [],
            };

            const { error: upErr } = await supabaseAdmin
              .from("chain_configs")
              .upsert(row, { onConflict: "store_id,chain" });
            if (upErr) {
              rejected.push({ chain: wireKey, reason: upErr.message });
              continue;
            }
            chainsLinked.push(wireKey);
          }

          if (chainsLinked.length > 0) {
            await supabaseAdmin
              .from("wallet_link_codes")
              .update({ used_at: new Date().toISOString() })
              .eq("id", codeRow.id);
          }

          if (chainsLinked.length === 0) {
            return json({ ok: false, error: "No chains accepted.", rejected }, 400);
          }

          return json({
            ok: true,
            store_id: store.id,
            merchant_name: store.name,
            chains_linked: chainsLinked,
            rejected,
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

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

// Escape `</script>` and HTML-special chars so embedding JSON inside a
// <script type="hm-link-manifest"> block can never break out of the tag.
function escapeForScriptTag(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Beekeeper wallet's manifest discovery looks for an HTML page containing
// `<script type="hm-link-manifest">…JSON…</script>`. Browsers/fetchers that
// ask for `application/json` still get raw JSON.
function manifestResponse(manifest: unknown, accept: string, status = 200) {
  const wantsJson = /application\/json/i.test(accept);
  const body = JSON.stringify(manifest);
  if (wantsJson) {
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Nectar Pay wallet link</title><script type="hm-link-manifest">${escapeForScriptTag(body)}</script></head><body><pre>${escapeForScriptTag(body)}</pre></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
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

// Locked hash recipe (byte-exact, matches Beekeeper):
//
//   sha256( addresses.map(a => a.trim()).sort().join("\n") )
//
// - hex-encoded lowercase
// - NO trailing newline
// - addresses compared CASE-SENSITIVELY (TXC is base58check, case matters —
//   lowercasing would corrupt the address)
// - de-duplicated on the exact trimmed string
// - empty set → sha256 of the empty string
//   ("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
function hashAddressSet(addrs: string[]): string {
  const norm = Array.from(new Set(addrs.map((a) => a.trim()))).filter(Boolean).sort();
  return createHash("sha256").update(norm.join("\n")).digest("hex");
}


function manifestFor(opts: {
  token: string;
  origin: string;
  host: string;
  storeName: string;
  expiresAtIso: string;
  allowNewWallet: boolean;
  knownAddresses: string[];
}) {
  const callbackUrl = `${opts.origin}/api/public/v1/wallet-link?token=${encodeURIComponent(opts.token)}`;
  return {
    v: 1,
    type: "hm-link-manifest",
    challenge_id: opts.token,
    callback_url: callbackUrl,
    // Same host as callback_url. Beekeeper SHOULD assert
    // `new URL(manifest_url).host === new URL(callback_url).host`
    // before signing.
    manifest_url: callbackUrl,
    from: opts.host,
    merchant: opts.storeName,
    chains: WIRE_CHAINS,
    // Unix SECONDS, equal to the link code's expires_at. Beekeeper MUST
    // refuse to sign if Date.now()/1000 > manifest.exp, independent of the
    // payload `exp` it constructs.
    exp: Math.floor(new Date(opts.expiresAtIso).getTime() / 1000),
    issued_at: new Date().toISOString(),
    // Trust-on-first-use hint. Per-code (single-use): the merchant ticked
    // "this is a new wallet" when minting this QR; the flag dies with the
    // code (used_at + 5-min TTL). When true, Beekeeper SHOULD prominently
    // warn the user before signing and SHOULD name the first/last 6 chars
    // of the address being bound. When false, the wallet's signing address
    // MUST hash-match `known_addresses_hash` or the POST will be 403.
    allow_new_wallet: opts.allowNewWallet,
    // Privacy: we DO NOT return the raw address list. Wallet computes the
    // same hash over its candidate set and compares; mismatch + !allow_new
    // means "this wallet isn't bound here yet, ask the merchant to re-mint
    // with new-wallet enabled."
    known_addresses_count: opts.knownAddresses.length,
    known_addresses_hash: hashAddressSet(opts.knownAddresses),
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
            .select("id, store_id, expires_at, used_at, created_by, allow_new_wallet")
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

          const { data: addrRows } = await supabaseAdmin
            .from("wallet_accounts")
            .select("wallet_address")
            .eq("user_id", codeRow.created_by);
          const knownAddresses = (addrRows ?? []).map((r) => r.wallet_address);

          return manifestResponse(
            manifestFor({
              token,
              origin: url.origin,
              host: url.host,
              storeName: store.name,
              expiresAtIso: codeRow.expires_at,
              allowNewWallet: !!codeRow.allow_new_wallet,
              knownAddresses,
            }),
            request.headers.get("accept") ?? "",
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
            .select("id, store_id, expires_at, used_at, created_by, allow_new_wallet")
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

          // 3. Signature check.
          //   - Default: signing address must already be registered to the
          //     merchant (wallet_accounts.user_id = codeRow.created_by). This
          //     means the merchant has previously signed into Nectar with
          //     this wallet.
          //   - Trust-on-first-use: if the merchant explicitly opted in via
          //     `allow_new_wallet` when minting the link code, we accept a
          //     never-seen address and register it. The Beekeeper wallet is
          //     expected to show a big warning before signing in this mode.
          const { data: addrRows } = await supabaseAdmin
            .from("wallet_accounts")
            .select("wallet_address")
            .eq("user_id", codeRow.created_by);
          // Case-sensitive: TXC addresses are base58check — lowercasing
          // would corrupt the comparison.
          const allowed = new Set(
            (addrRows ?? []).map((r) => r.wallet_address.trim()),
          );
          const addressKnown = allowed.has(address.trim());

          if (!addressKnown && !codeRow.allow_new_wallet) {
            return json(
              {
                error: "Signing address not registered to this merchant.",
                code: "unknown_signer",
                hint:
                  "Either sign in to Nectar with this wallet first, or have the merchant re-mint the link code with 'link a new wallet' enabled.",
              },
              403,
            );
          }

          const message = canonicalize(payload);
          const sigOk = verifyTxcSignature({ address, message, signature });
          if (!sigOk) return json({ error: "Invalid signature." }, 401);

          // CLAIM the code atomically BEFORE any side effects. This makes
          // allow_new_wallet strictly single-use: a parallel POST against
          // the same QR loses the race and gets 410. We re-check used_at
          // via the conditional update and bail if it returns zero rows.
          const claimedAt = new Date().toISOString();
          const { data: claimed, error: claimErr } = await supabaseAdmin
            .from("wallet_link_codes")
            .update({ used_at: claimedAt })
            .eq("id", codeRow.id)
            .is("used_at", null)
            .select("id")
            .maybeSingle();
          if (claimErr || !claimed) {
            return json({ error: "Token already used." }, 410);
          }

          // Trust-on-first-use: register this address to the merchant so
          // future links (and Nectar sign-in) recognize it. Safe to do
          // AFTER claim — only one POST can reach this point per code.
          if (!addressKnown && codeRow.allow_new_wallet) {
            await supabaseAdmin
              .from("wallet_accounts")
              .insert({
                user_id: codeRow.created_by,
                wallet_address: address.trim(),
              });
          }

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

          // Code was already claimed pre-flight; no second update needed.
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

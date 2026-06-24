// Wallet Link — HTTPS-only handshake between the Bee Keeper / Nectar wallet
// and a NectarPay merchant store.
//
// FLOW
//   1. Merchant clicks "Link wallet" on the Chains page → server mints a one-time
//      token (5 min TTL, sha256-hashed at rest) tied to their store.
//   2. UI renders a QR encoding a plain HTTPS URL:
//        https://<host>/api/public/v1/wallet-link?token=<token>
//      Wallet is web/PWA — custom schemes don't fire, so the QR is a real URL.
//   3. Wallet GETs that URL → receives the link manifest (callback_url, from,
//      chains, exp, signing spec, challenge_id).
//   4. Wallet signs the canonical JSON of
//        { challenge_id, callback_url, from, chains, exp, xpubs }
//      with the merchant's TXC wallet key (the one they already log in with).
//   5. Wallet POSTs { ...payload, address, signature } back to callback_url.
//   6. Server re-canonicalizes, verifies the signature against an address
//      registered to the user who created the token, validates each xpub,
//      writes chain_configs, and burns the token.
//
// SIGNING PRIMITIVE (the manifest exposes this verbatim so wallets stay aligned)
//   curve            : secp256k1
//   hash             : double-SHA256 with TXC magic-prefix (Bitcoin-style)
//   prefix           : "TEXITcoin Signed Message:\n"
//   encoding         : base64 (65-byte recoverable ECDSA)
//   key              : TXC account key — same one used for wallet login
//   address_formats  : p2pkh, p2sh-p2wpkh, p2wpkh (txc bech32)
//   derivation       : m/44'/696969'/0'/0/0 (Bee Keeper's TXC receive 0)
//   canonical_json   : JSON.stringify with object keys sorted ascending, UTF-8,
//                      no whitespace. Arrays preserved in order.
//
// SECURITY
//   - Bearer-style query token, single-use, 5-min TTL, sha256-hashed at rest.
//   - Signature MUST be from a wallet address registered to the token issuer
//     (looked up via wallet_accounts.user_id = wallet_link_codes.created_by).
//   - All four envelope fields (challenge_id, callback_url, from, chains, exp)
//     are inside the signed payload — a stripped or replayed POST won't verify.
//   - chain_configs.enabled is never auto-flipped on; the merchant reviews.
//   - The audit trigger logs every xpub change → xpub-alert cron → Telegram.

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

// Chains the wallet is allowed to push. TXC is first-class — never omit it.
const SUPPORTED_CHAINS = ["btc", "txc", "eth", "ltc", "bch", "doge", "tron"] as const;
type ChainKey = (typeof SUPPORTED_CHAINS)[number];

const XpubEntry = z.object({
  xpub: z.string().min(80).max(160),
  path: z.string().max(64).optional(),
});

const XpubMap = z.object({
  btc: XpubEntry.optional(),
  txc: XpubEntry.optional(),
  eth: XpubEntry.optional(),
  evm: XpubEntry.optional(), // alias — normalized to eth
  ltc: XpubEntry.optional(),
  bch: XpubEntry.optional(),
  doge: XpubEntry.optional(),
  tron: XpubEntry.optional(),
});

const SubmitBody = z.object({
  version: z.literal(1),
  challenge_id: z.string().min(8).max(128),
  callback_url: z.string().url(),
  from: z.string().min(1).max(253),
  chains: z.array(z.enum(SUPPORTED_CHAINS)).min(1),
  exp: z.number().int().positive(),
  xpubs: XpubMap,
  address: z.string().min(20).max(80),
  signature: z.string().min(40).max(200),
});

// Canonical JSON: object keys sorted ascending; arrays preserve order.
// Wallets must reproduce this byte-for-byte before signing.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

function manifestFor(opts: {
  token: string;
  origin: string;
  storeName: string;
  expiresAtIso: string;
}) {
  return {
    version: 1,
    challenge_id: opts.token,
    callback_url: `${opts.origin}/api/public/v1/wallet-link`,
    from: new URL(opts.origin).host,
    merchant: opts.storeName,
    chains: SUPPORTED_CHAINS,
    exp: new Date(opts.expiresAtIso).getTime(),
    signing: {
      curve: "secp256k1",
      hash: "sha256d-magic",
      prefix: "TEXITcoin Signed Message:\n",
      encoding: "base64",
      key: "txc-account",
      address_formats: ["p2pkh", "p2sh-p2wpkh", "p2wpkh"],
      derivation: "m/44'/696969'/0'/0/0",
      canonical_json:
        "JSON.stringify with object keys sorted ascending; UTF-8; no whitespace",
      signed_fields: ["challenge_id", "callback_url", "from", "chains", "exp", "xpubs"],
    },
  };
}

export const Route = createFileRoute("/api/public/v1/wallet-link")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // Wallet scans QR → GETs this with ?token=… to fetch the link manifest.
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
            return json({ error: "Bad request body.", details: parse.error.flatten() }, 400);
          }
          const body = parse.data;

          // 1. Token lookup.
          const code_hash = createHash("sha256").update(body.challenge_id).digest("hex");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: codeRow } = await supabaseAdmin
            .from("wallet_link_codes")
            .select("id, store_id, expires_at, used_at, created_by")
            .eq("code_hash", code_hash)
            .maybeSingle();
          if (!codeRow) return json({ error: "Unknown link token." }, 404);
          if (codeRow.used_at) return json({ error: "Token already used." }, 410);
          if (new Date(codeRow.expires_at).getTime() < Date.now()) {
            return json({ error: "Token expired." }, 410);
          }

          // 2. Envelope sanity — must match what we'd have signed in the manifest.
          const url = new URL(request.url);
          const expectedCallback = `${url.origin}/api/public/v1/wallet-link`;
          if (body.callback_url !== expectedCallback) {
            return json({ error: "callback_url mismatch." }, 400);
          }
          if (body.from !== url.host) {
            return json({ error: "from mismatch." }, 400);
          }
          if (body.exp < Date.now()) {
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
          if (!allowed.has(body.address.trim().toLowerCase())) {
            return json({ error: "Signing address not registered to this merchant." }, 403);
          }

          const message = canonicalize({
            challenge_id: body.challenge_id,
            callback_url: body.callback_url,
            from: body.from,
            chains: body.chains,
            exp: body.exp,
            xpubs: body.xpubs,
          });
          const sigOk = verifyTxcSignature({
            address: body.address,
            message,
            signature: body.signature,
          });
          if (!sigOk) return json({ error: "Invalid signature." }, 401);

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, name")
            .eq("id", codeRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          // 4. Normalize evm → eth and write chain_configs.
          const incoming: Partial<Record<ChainKey, { xpub: string; path?: string }>> = {
            btc: body.xpubs.btc,
            txc: body.xpubs.txc,
            eth: body.xpubs.eth ?? body.xpubs.evm,
            ltc: body.xpubs.ltc,
            bch: body.xpubs.bch,
            doge: body.xpubs.doge,
            tron: body.xpubs.tron,
          };

          const accepted: ChainKey[] = [];
          const rejected: { chain: ChainKey; reason: string }[] = [];

          for (const [chain, entry] of Object.entries(incoming) as [
            ChainKey,
            { xpub: string; path?: string } | undefined,
          ][]) {
            if (!entry) continue;
            const xpub = entry.xpub.trim();
            if (!isXpubLike(xpub)) {
              rejected.push({ chain, reason: "Invalid xpub format." });
              continue;
            }

            const { data: existing } = await supabaseAdmin
              .from("chain_configs")
              .select("id, enabled, stables")
              .eq("store_id", store.id)
              .eq("chain", chain)
              .maybeSingle();

            const payload = {
              store_id: store.id,
              chain,
              network: "mainnet",
              xpub,
              xpub_or_address: xpub,
              derivation_path: entry.path ?? null,
              enabled: existing?.enabled ?? false, // merchant flips on after review
              stables: existing?.stables ?? [],
            };

            const { error: upErr } = await supabaseAdmin
              .from("chain_configs")
              .upsert(payload, { onConflict: "store_id,chain" });
            if (upErr) {
              rejected.push({ chain, reason: upErr.message });
              continue;
            }
            accepted.push(chain);
          }

          if (accepted.length > 0) {
            await supabaseAdmin
              .from("wallet_link_codes")
              .update({ used_at: new Date().toISOString() })
              .eq("id", codeRow.id);
          }

          return json(
            {
              merchantId: store.id,
              merchantName: store.name,
              accepted,
              rejected,
            },
            accepted.length > 0 ? 200 : 400,
          );
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

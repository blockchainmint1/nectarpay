// POST /api/public/v1/wallet-link
// Bearer-authenticated endpoint the Nectar wallet calls with its xpubs.
//
// Header: Authorization: Bearer <one-time-token>
// Body:   { version: 1, btc?:{xpub,path}, txc?:{xpub,path}, evm?:{xpub,path},
//           ltc?:{xpub,path}, bch?:{xpub,path}, tron?:{xpub,path} }
//
// Each chain entry: { xpub: string, path?: string }
//
// Rules:
//  - Token verified by sha256, must be unused + unexpired.
//  - Each xpub validated with isXpubLike.
//  - chain_configs rows upserted (onConflict: store_id,chain).
//  - enabled is NOT auto-flipped on (merchant decides).
//  - The audit trigger on chain_configs records every change; the xpub-alert
//    cron picks those up and sends Telegram notifications.

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { isXpubLike } from "@/lib/chains/derive.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const XpubEntry = z.object({
  xpub: z.string().min(80).max(160),
  path: z.string().max(64).optional(),
});

// Accept ChainKind keys the wallet might send. evm is collapsed to "eth"
// (canonical key on this side — same xpub covers Base/BSC per EVM_NETWORKS).
const Body = z.object({
  version: z.literal(1),
  btc: XpubEntry.optional(),
  txc: XpubEntry.optional(),
  evm: XpubEntry.optional(),
  eth: XpubEntry.optional(),
  ltc: XpubEntry.optional(),
  bch: XpubEntry.optional(),
  doge: XpubEntry.optional(),
  tron: XpubEntry.optional(),
});

type ChainKey = "btc" | "txc" | "eth" | "ltc" | "bch" | "doge" | "tron";

export const Route = createFileRoute("/api/public/v1/wallet-link")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const m = auth.match(/^Bearer\s+(.+)$/i);
          if (!m) return json({ error: "Missing bearer token." }, 401);
          const token = m[1].trim();
          const code_hash = createHash("sha256").update(token).digest("hex");

          const raw = await request.json().catch(() => null);
          const parse = Body.safeParse(raw);
          if (!parse.success) {
            return json({ error: "Bad request body.", details: parse.error.flatten() }, 400);
          }

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

          // Normalize evm → eth.
          const body = parse.data;
          const incoming: Partial<Record<ChainKey, { xpub: string; path?: string }>> = {
            btc: body.btc,
            txc: body.txc,
            eth: body.eth ?? body.evm,
            ltc: body.ltc,
            bch: body.bch,
            doge: body.doge,
            tron: body.tron,
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

            // Read existing row so we leave enabled/stables intact on updates.
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
              // Do NOT auto-enable. Merchant flips chains on after they review.
              enabled: existing?.enabled ?? false,
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

          // Mark code consumed only if we wrote at least one chain.
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

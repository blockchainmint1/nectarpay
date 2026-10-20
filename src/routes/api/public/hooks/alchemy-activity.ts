// Alchemy Address Activity webhook receiver.
//
// Alchemy POSTs here within ~1–3s of a tx being broadcast to the mempool
// for any address registered with one of our per-chain webhooks. We verify
// the HMAC-SHA256 signature using the signing key persisted in
// `alchemy_webhooks`, then run the same settlement path the cron watcher
// uses (effectiveConfsRequired → recordTransaction → settleInvoice).
//
// Path is under /api/public/ so it bypasses Lovable's auth gate; we verify
// every request via signature before doing any DB writes.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { ETH_NETWORK, BASE_NETWORK, BSC_NETWORK, type EvmNetwork } from "@/lib/chains/networks";
import { scanEvmInvoiceNow } from "@/lib/watcher.functions";
import { identifyEvmAsset } from "@/lib/chains/evm-asset";

interface AlchemyActivity {
  fromAddress: string;
  toAddress: string;
  blockNum: string; // hex
  hash: string;
  value: number;
  asset: string;
  category: "external" | "internal" | "token";
  rawContract: { rawValue: string; address: string | null; decimals: number | null };
}

interface AlchemyPayload {
  webhookId: string;
  id: string;
  type: string;
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

const NETWORK_TO_CHAIN: Record<string, { chain: string; net: EvmNetwork }> = {
  ETH_MAINNET: { chain: "eth", net: ETH_NETWORK },
  BASE_MAINNET: { chain: "base", net: BASE_NETWORK },
  BNB_MAINNET: { chain: "bsc", net: BSC_NETWORK },
};

function verifySignature(body: string, signature: string, signingKey: string): boolean {
  const expected = createHmac("sha256", signingKey).update(body, "utf8").digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/alchemy-activity")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-alchemy-signature") ?? "";

        let payload: AlchemyPayload;
        try {
          payload = JSON.parse(raw) as AlchemyPayload;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        // Look up signing key by webhookId, then HMAC-verify.
        const { getSigningKeyForWebhook } = await import("@/lib/alchemy-notify.server");
        const signingKey = await getSigningKeyForWebhook(payload.webhookId);
        if (!signingKey) return new Response("Unknown webhook", { status: 401 });
        if (!signature || !verifySignature(raw, signature, signingKey)) {
          return new Response("Invalid signature", { status: 401 });
        }

        if (payload.type !== "ADDRESS_ACTIVITY") {
          return new Response("ok"); // ignore unsupported event types
        }

        const netInfo = NETWORK_TO_CHAIN[payload.event.network];
        if (!netInfo) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const scanned = new Set<string>();

        for (const act of payload.event.activity ?? []) {
          try {
            const asset = identifyEvmAsset(netInfo.net, act.category, act.rawContract?.address);
            if (!asset) continue;
            // Push notifications are hints only. The shared scanner reads the
            // actual chain, checks contract/decimals/time and guarded recording.
            const matchChains = (asset.isNative ? [netInfo.chain] : ["eth", "base", "bsc"]) as never[];

            const { data: candidates } = await supabaseAdmin
              .from("invoices")
              .select("id, token_symbol")
              .ilike("address", act.toAddress) // checksum-cased storage; case-insensitive match
              .in("chain", matchChains)
              .in("status", ["pending", "detected", "underpaid"]);

            for (const inv of candidates ?? []) {
              const matches = asset.isNative
                ? inv.token_symbol == null
                : (inv.token_symbol ?? "").toUpperCase() === asset.symbol.toUpperCase();
              if (!matches || scanned.has(inv.id)) continue;
              scanned.add(inv.id);
              await scanEvmInvoiceNow(inv.id);
            }
          } catch (e) {
            console.error("[alchemy-activity] activity processing failed:", e);
          }
        }

        return new Response("ok");
      },
    },
  },
});

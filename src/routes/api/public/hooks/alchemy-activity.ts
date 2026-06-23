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
import { settleInvoice } from "@/lib/watcher.functions";
import { getUsdRate } from "@/lib/rates.functions";

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

async function recordAndSettle(
  invoiceId: string,
  txHash: string,
  paidCrypto: number,
  confirmations: number,
  blockHeight: number | null,
  isConfirmed: boolean,
  tokenSymbol: string | null,
  paidUsd: number,
  amountDueUsd: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("invoice_id", invoiceId)
    .eq("tx_hash", txHash)
    .maybeSingle();
  const now = new Date().toISOString();
  if (existing) {
    await supabaseAdmin
      .from("transactions")
      .update({ confirmations, block_height: blockHeight, confirmed_at: isConfirmed ? now : null })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("transactions").insert({
      invoice_id: invoiceId,
      tx_hash: txHash,
      amount: paidCrypto,
      confirmations,
      block_height: blockHeight,
      first_seen_at: now,
      confirmed_at: isConfirmed ? now : null,
      token_symbol: tokenSymbol,
    });
  }
  if (isConfirmed) {
    await settleInvoice(invoiceId, paidUsd, amountDueUsd);
  } else {
    // Mark detected (pending → detected) so the terminal flips status fast.
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (inv?.status === "pending") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "detected" })
        .eq("id", invoiceId)
        .eq("status", "pending");
    }
  }
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

        // Current tip for confirmation count.
        const { data: cursor } = await supabaseAdmin
          .from("watcher_cursors")
          .select("last_height")
          .eq("chain", netInfo.chain)
          .maybeSingle();
        const tipHint = Number(cursor?.last_height ?? 0);

        for (const act of payload.event.activity ?? []) {
          try {
            const isNative = act.category === "external" || act.category === "internal";
            const rawValue = BigInt(act.rawContract.rawValue || "0");
            const decimals = act.rawContract.decimals ?? (isNative ? 18 : 18);
            const human = Number(rawValue) / 10 ** decimals;
            const blockNum = parseInt(act.blockNum, 16);
            const confirmations = Math.max(1, tipHint - blockNum + 1);

            // Native → token_symbol IS NULL; chain may be the specific net or "eth"
            // (the unified label the watcher also accepts).
            // Stable → token_symbol matches; chain can be any of eth/base/bsc (one
            // address backs all three for stables enabled on the shared xpub).
            const matchChains = (
              isNative ? [netInfo.chain, "eth"] : ["eth", "base", "bsc"]
            ) as never[];

            const { data: candidates } = await supabaseAdmin
              .from("invoices")
              .select("id, fiat_amount, status, token_symbol, chain, rate, stores!inner(default_confirmations_required, mempool_max_usd)")
              .ilike("address", act.toAddress) // checksum-cased storage; case-insensitive match
              .in("chain", matchChains)
              .in("status", ["pending", "detected", "underpaid"]);

            type InvRow = {
              id: string;
              fiat_amount: number;
              status: string;
              token_symbol: string | null;
              chain: string;
              rate: number | null;
              stores: { default_confirmations_required: number | null; mempool_max_usd: number | null } | null;
            };
            const inv = ((candidates ?? []) as InvRow[]).find((c) =>
              isNative
                ? c.token_symbol == null
                : (c.token_symbol ?? "").toUpperCase() === act.asset.toUpperCase(),
            );
            if (!inv) continue;

            const lockedRate = inv.rate == null ? null : Number(inv.rate);
            const usdRate = isNative
              ? (lockedRate && lockedRate > 0 ? lockedRate : await getUsdRate(netInfo.chain))
              : 1; // stables ~ $1
            const paidUsd = human * usdRate;

            // Confirmation requirement (mirrors watcher.functions.ts logic).
            const zc = inv.stores?.mempool_max_usd == null ? null : Number(inv.stores.mempool_max_usd);
            const required =
              zc != null && zc > 0 && paidUsd <= zc
                ? 0
                : inv.stores?.default_confirmations_required ?? netInfo.net.confirmationsRequired;
            const isConfirmed = confirmations >= required;

            await recordAndSettle(
              inv.id,
              act.hash,
              human,
              confirmations,
              blockNum,
              isConfirmed,
              isNative ? null : act.asset,
              paidUsd,
              Number(inv.fiat_amount),
            );
          } catch (e) {
            console.error("[alchemy-activity] activity processing failed:", e);
          }
        }

        return new Response("ok");
      },
    },
  },
});

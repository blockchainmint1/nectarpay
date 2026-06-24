// GET /api/public/v1/terminals/options  (HMAC-signed, empty body)
// Returns the list of payment options enabled on the terminal's store, so the
// POS app can let the cashier offer "BTC", "USDC on Base", etc. before
// generating the QR. Same shape as checkout.functions.ts availableOptions.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const NATIVE_LABEL: Record<string, string> = {
  btc: "Bitcoin",
  txc: "TEXITcoin",
  eth: "Ethereum",
  base: "Base",
  bsc: "BNB Smart Chain",
  tron: "Tron",
  sol: "Solana",
  doge: "Dogecoin",
  isk: "Iskander",
  zcu: "ZCU",
};

export const Route = createFileRoute("/api/public/v1/terminals/options")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, "");
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [cfgsRes, storeRes] = await Promise.all([
            supabaseAdmin
              .from("chain_configs")
              .select("chain, stables, display_order")
              .eq("store_id", auth.terminal.store_id)
              .eq("enabled", true)
              .order("display_order", { ascending: true }),
            supabaseAdmin
              .from("stores")
              .select("name, pos_tip_enabled, pos_signature_enabled, pos_email_receipt_enabled, receipt_business_name, receipt_address, receipt_logo_url, receipt_footer, receipt_tax_id")
              .eq("id", auth.terminal.store_id)
              .maybeSingle(),
          ]);
          const cfgs = cfgsRes.data;
          const store = storeRes.data;

          const { SUPPORTED_STABLES_BY_CHAIN, evmChainsForStable, EVM_CHAIN_LABEL } = await import(
            "@/lib/chains/networks"
          );

          function joinNetworks(names: string[]): string {
            if (names.length <= 1) return names.join("");
            if (names.length === 2) return `${names[0]} or ${names[1]}`;
            return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
          }

          const NATIVE_OPT_IN: Record<string, string> = { eth: "ETH", tron: "TRX", sol: "SOL" };

          const options: Array<{ key: string; chain: string; tokenSymbol: string | null; label: string }> = [];
          for (const cfg of cfgs ?? []) {
            const chain = cfg.chain as string;
            const enabled = ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());
            const nativeOptIn = NATIVE_OPT_IN[chain];
            const includeNative = !nativeOptIn || enabled.includes(nativeOptIn);
            if (includeNative) {
              options.push({
                chain,
                tokenSymbol: null,
                key: chain,
                label: NATIVE_LABEL[chain] ?? chain.toUpperCase(),
              });
            }
            const allow = (SUPPORTED_STABLES_BY_CHAIN as Record<string, readonly string[] | undefined>)[chain] ?? [];
            for (const sym of allow) {
              if (sym === nativeOptIn) continue;
              if (!enabled.includes(sym)) continue;
              let label: string;
              if (chain === "eth") {
                const nets = evmChainsForStable(sym).map((k) => EVM_CHAIN_LABEL[k]);
                label = `${sym} on ${joinNetworks(nets)}`;
              } else {
                label = `${sym} on ${NATIVE_LABEL[chain] ?? chain.toUpperCase()}`;
              }
              options.push({ chain, tokenSymbol: sym, key: `${chain}:${sym}`, label });
            }
          }

          return json({
            options,
            experience: {
              tip_enabled: store?.pos_tip_enabled ?? true,
              signature_enabled: store?.pos_signature_enabled ?? false,
              email_receipt_enabled: store?.pos_email_receipt_enabled ?? false,
            },
            receipt: {
              business_name: store?.receipt_business_name ?? store?.name ?? null,
              address: store?.receipt_address ?? null,
              logo_url: store?.receipt_logo_url ?? null,
              footer: store?.receipt_footer ?? null,
              tax_id: store?.receipt_tax_id ?? null,
            },
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});

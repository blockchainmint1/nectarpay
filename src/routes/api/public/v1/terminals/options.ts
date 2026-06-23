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
          const { data: cfgs } = await supabaseAdmin
            .from("chain_configs")
            .select("chain, stables")
            .eq("store_id", auth.terminal.store_id)
            .eq("enabled", true);

          const { SUPPORTED_STABLES_BY_CHAIN, evmChainsForStable, EVM_CHAIN_LABEL } = await import(
            "@/lib/chains/networks"
          );

          function joinNetworks(names: string[]): string {
            if (names.length <= 1) return names.join("");
            if (names.length === 2) return `${names[0]} or ${names[1]}`;
            return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
          }

          const options: Array<{ key: string; chain: string; tokenSymbol: string | null; label: string }> = [];
          for (const cfg of cfgs ?? []) {
            const chain = cfg.chain as string;
            options.push({
              chain,
              tokenSymbol: null,
              key: chain,
              label: NATIVE_LABEL[chain] ?? chain.toUpperCase(),
            });
            const allow = (SUPPORTED_STABLES_BY_CHAIN as Record<string, readonly string[] | undefined>)[chain] ?? [];
            const enabled = ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());
            for (const sym of allow) {
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

          return json({ options });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});

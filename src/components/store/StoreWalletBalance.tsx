import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Wallet } from "lucide-react";

import { listBalanceChains, getChainBalances } from "@/lib/balances.functions";

const MAX_SCAN = 20;

/** Scans every linked chain (sale addresses #1 and up, never #0) and totals the USD value. */
export function StoreWalletBalance({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const listChains = useServerFn(listBalanceChains);
  const loadChain = useServerFn(getChainBalances);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["store-wallet-total", storeId],
    staleTime: 60_000,
    queryFn: async () => {
      const { chains } = await listChains({ data: { storeId } });
      const linked = chains.filter((c) => c.configured);
      const results = await Promise.allSettled(
        linked.map((c) =>
          loadChain({
            data: {
              storeId,
              chain: c.chain,
              start: c.derived ? 1 : 0,
              count: c.derived ? Math.min(MAX_SCAN, Math.max(1, c.nextIndex - 1)) : 1,
            },
          }),
        ),
      );
      let total = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === "fulfilled") total += r.value.totalUsd;
        else failed++;
      }
      return { total, chains: linked.length, failed };
    },
  });

  return (
    <div className="min-w-[15rem] rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 text-primary" /> Wallet balance
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Refresh wallet balance"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {data ? `$${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Scanning…"}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {data ? `${data.chains} chain${data.chains === 1 ? "" : "s"} scanned` : "Checking every chain"}
          {data?.failed ? ` · ${data.failed} unavailable` : ""}
        </span>
        <Link to="/stores/$storeId/balances" params={{ storeId: storeSlug }} className="text-primary hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
}

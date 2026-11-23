import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Wallet } from "lucide-react";

import { listBalanceChains, getChainBalances } from "@/lib/balances.functions";
import { balancePages } from "@/lib/balance-pages";

/** Scans every sale address on every linked chain and totals the USD value. */
export function StoreWalletBalance({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const listChains = useServerFn(listBalanceChains);
  const loadChain = useServerFn(getChainBalances);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["store-wallet-total", storeId],
    staleTime: 60_000,
    queryFn: async () => {
      const { chains } = await listChains({ data: { storeId } });
      const linked = chains.filter((c) => c.configured);
      const jobs = linked.flatMap((c) =>
        balancePages(c).map((p) => ({ chain: c.chain, ...p })),
      );

      let total = 0;
      let addresses = 0;
      const failedChains = new Set<string>();
      // Three pages in flight at once keeps the free blockchain readers happy.
      for (let i = 0; i < jobs.length; i += 3) {
        const results = await Promise.allSettled(
          jobs.slice(i, i + 3).map((j) => loadChain({ data: { storeId, ...j } })),
        );
        results.forEach((r, k) => {
          const job = jobs[i + k];
          if (r.status === "fulfilled") {
            total += r.value.totalUsd;
            addresses += r.value.addresses.length;
            if (r.value.addresses.some((a) => a.error) && job) failedChains.add(job.chain);
          } else if (job) failedChains.add(job.chain);
        });
      }
      return { total, chains: linked.length, addresses, failed: failedChains.size };
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
        {data
          ? `$${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "Scanning…"}
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {data
            ? `${data.addresses} address${data.addresses === 1 ? "" : "es"} on ${data.chains} chain${data.chains === 1 ? "" : "s"}`
            : "Checking every chain"}
          {data?.failed ? ` · ${data.failed} not reachable` : ""}
        </span>
        <Link to="/stores/$storeId/balances" params={{ storeId: storeSlug }} className="text-primary hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
}

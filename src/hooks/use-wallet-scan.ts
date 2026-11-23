import { useCallback, useMemo } from "react";
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getChainBalances, listBalanceChains } from "@/lib/balances.functions";
import { balancePages } from "@/lib/balance-pages";
import { summarizeWalletScan, type ScanPage, type WalletScanSummary } from "@/lib/wallet-assets";

// Free blockchain readers rate-limit hard, so at most three pages load at once
// across the whole app (store card and Wallet balances page share the cache).
const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((r) => waiting.push(r));
  else inFlight++;
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else inFlight--;
  }
}

type PageData = Awaited<ReturnType<typeof getChainBalances>>;

/** Scans every sale address on every linked network, page by page, and totals it. */
export function useWalletScan(storeId: string) {
  const qc = useQueryClient();
  const listChains = useServerFn(listBalanceChains);
  const loadPage = useServerFn(getChainBalances);

  const chainsQ = useQuery({
    queryKey: ["wallet-chains", storeId],
    queryFn: () => listChains({ data: { storeId } }),
    staleTime: 5 * 60_000,
  });
  const chains = useMemo(() => chainsQ.data?.chains ?? [], [chainsQ.data]);

  const jobs = useMemo(
    () =>
      chains
        .filter((c) => c.configured)
        .flatMap((c) => balancePages(c).map((p) => ({ chain: c.chain, ...p }))),
    [chains],
  );

  const combine = useCallback(
    (results: UseQueryResult<PageData>[]) => {
      const pages: ScanPage[] = [];
      const pendingChains = new Set<string>();
      const failedChains = new Set<string>();
      let done = 0;
      let updatedAt = 0;
      results.forEach((r, i) => {
        const job = jobs[i];
        if (!job) return;
        if (r.data) {
          pages.push({ chain: job.chain, addresses: r.data.addresses, rates: r.data.rates });
          updatedAt = Math.max(updatedAt, r.dataUpdatedAt);
        }
        if (r.data || r.isError) done++;
        else pendingChains.add(job.chain);
        if (r.isError) failedChains.add(job.chain);
      });
      const summary: WalletScanSummary = summarizeWalletScan(pages);
      return {
        summary,
        done,
        pendingChains,
        failedChains,
        updatedAt,
        fetching: results.some((r) => r.isFetching),
      };
    },
    [jobs],
  );

  const scan = useQueries({
    queries: jobs.map((j) => ({
      queryKey: ["wallet-page", storeId, j.chain, j.start, j.count],
      queryFn: () => limited(() => loadPage({ data: { storeId, ...j } })),
      staleTime: 2 * 60_000,
      retry: 1,
    })),
    combine,
  });

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["wallet-chains", storeId] });
    void qc.invalidateQueries({ queryKey: ["wallet-page", storeId] });
  }, [qc, storeId]);

  const total = jobs.length;
  return {
    chains,
    paidSales: chainsQ.data?.paidSales ?? null,
    loadingChains: chainsQ.isLoading,
    ...scan,
    total,
    scanning: chainsQ.isLoading || scan.done < total,
    progress: total ? scan.done / total : chainsQ.isLoading ? 0 : 1,
    refresh,
  };
}

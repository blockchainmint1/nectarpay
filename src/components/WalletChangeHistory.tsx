import { useInfiniteQuery } from "@tanstack/react-query";
import { History, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;
const NETWORK_NAMES: Record<string, string> = {
  txc: "TEXITcoin (TXC)", eth: "EVM", btc: "Bitcoin", base: "Base",
  bsc: "BSC", zcu: "ZCU", isk: "ISK", ltc: "Litecoin", bch: "Bitcoin Cash",
  doge: "Dogecoin", dash: "Dash", tron: "Tron", sol: "Solana", lightning: "Bitcoin Lightning",
};

export function walletHistoryDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "medium", timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

function shortKey(value: string | null) {
  if (!value) return "Not set";
  return value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

export function useWalletChangeHistory(storeId: string) {
  return useInfiniteQuery({
    queryKey: ["wallet-change-history", storeId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error, count } = await supabase.from("chain_config_audit")
        .select("id, chain, action, created_at, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address", { count: "exact" })
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0, offset: pageParam };
    },
    getNextPageParam: (page) => page.offset + page.rows.length < page.count
      ? page.offset + PAGE_SIZE : undefined,
    refetchInterval: 30_000,
  });
}

export function WalletChangeHistory({ history }: { history: ReturnType<typeof useWalletChangeHistory> }) {
  const rows = history.data?.pages.flatMap((page) => page.rows) ?? [];
  return (
    <section id="wallet-change-history" tabIndex={-1} className="mt-10 scroll-mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><History className="h-5 w-5 text-primary" />Wallet change history</h2>
        <Button variant="ghost" size="icon" aria-label="Refresh wallet history" title="Refresh wallet history" disabled={history.isFetching} onClick={() => void history.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {history.isPending ? <p className="mt-4 text-sm text-muted-foreground">Loading history…</p>
        : history.isError ? <p className="mt-4 text-sm text-destructive">Could not load wallet history. Please try refreshing.</p>
        : rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No wallet-key changes recorded.</p>
        : <ol className="mt-4 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-sm font-medium">{NETWORK_NAMES[row.chain] ?? row.chain.toUpperCase()} · {row.action === "insert" ? "Wallet key added" : "Wallet key changed"}</span>
                <time dateTime={row.created_at} className="text-xs text-muted-foreground">{walletHistoryDate(row.created_at)}</time>
              </div>
              <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <div className="min-w-0"><span className="text-muted-foreground">Previous: </span><code className="break-all">{shortKey(row.old_xpub || row.old_xpub_or_address)}</code></div>
                <div className="min-w-0"><span className="text-muted-foreground">New: </span><code className="break-all">{shortKey(row.new_xpub || row.new_xpub_or_address)}</code></div>
              </div>
            </li>
          ))}
        </ol>}
      {history.hasNextPage && <div className="mt-4 flex justify-center"><Button variant="outline" disabled={history.isFetching} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? "Loading…" : "Load older changes"}</Button></div>}
    </section>
  );
}
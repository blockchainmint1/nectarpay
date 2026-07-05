import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, ExternalLink, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type SortKey = "first_seen_at" | "amount" | "confirmations";
type SortDir = "asc" | "desc";

interface StoreItem {
  id: string;
  name: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function TransactionsTable({ userId, stores }: { userId: string | undefined; stores?: StoreItem[] }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("first_seen_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const storeList = stores ?? [];

  const query = useQuery({
    queryKey: ["dashboard-transactions", userId, page, pageSize, sortKey, sortDir, search, storeFilter],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("transactions")
        .select(
          `id, tx_hash, amount, confirmations, block_height, first_seen_at, confirmed_at, token_symbol,
           invoice:invoices!inner(id, fiat_amount, fiat_currency, status, external_order_id, chain, store:stores!inner(id, name))`,
          { count: "exact" }
        )
        .order(sortKey, { ascending: sortDir === "asc", nullsFirst: false })
        .range(from, to);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(`tx_hash.ilike.%${s}%`);
      }

      if (storeFilter !== "all") {
        q = q.eq("invoice.store_id", storeFilter);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.count ?? 0) / pageSize));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  function SortHead({ k, children, align = "left" }: { k: SortKey; children: React.ReactNode; align?: "left" | "right" }) {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground ${
          align === "right" ? "justify-end w-full" : ""
        }`}
      >
        {children}
        <Icon className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(0);
            }}
            placeholder="Search by tx hash…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-4 py-2.5"><SortHead k="first_seen_at">Seen</SortHead></th>
              <th className="px-4 py-2.5">Store</th>
              <th className="px-4 py-2.5">Tx hash</th>
              <th className="px-4 py-2.5 text-right"><SortHead k="amount" align="right">Amount</SortHead></th>
              <th className="px-4 py-2.5 text-right">Value</th>
              <th className="px-4 py-2.5 text-right"><SortHead k="confirmations" align="right">Conf.</SortHead></th>
              <th className="px-4 py-2.5">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : query.error ? (
              <tr><td colSpan={7} className="p-8 text-center text-destructive">Failed to load transactions</td></tr>
            ) : (query.data?.rows ?? []).length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No transactions yet</td></tr>
            ) : (
              query.data!.rows.map((r: any) => {
                const inv = Array.isArray(r.invoice) ? r.invoice[0] : r.invoice;
                const store = inv ? (Array.isArray(inv.store) ? inv.store[0] : inv.store) : null;
                const symbol = r.token_symbol || tickerForChain(inv?.chain);
                const fiatCurrency = inv?.fiat_currency || store?.fiat_currency || "USD";
                const fiatVal = inv?.fiat_amount != null ? Number(inv.fiat_amount) : null;
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(r.first_seen_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {store ? (
                        <Link to="/stores/$storeId" params={{ storeId: store.id }} className="hover:underline">
                          {store.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <span title={r.tx_hash}>{r.tx_hash.slice(0, 10)}…{r.tx_hash.slice(-6)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <span title={String(r.amount)}>{formatCryptoAmount(r.amount, symbol)}</span>
                      {symbol ? <span className="ml-1 text-xs text-muted-foreground">{symbol}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap text-muted-foreground">
                      {fiatVal != null
                        ? new Intl.NumberFormat(undefined, { style: "currency", currency: fiatCurrency, maximumFractionDigits: 2 }).format(fiatVal)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.confirmations}</td>
                    <td className="px-4 py-2.5">
                      {inv ? (
                        <Link
                          to="/i/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <StatusBadge status={inv.status} />
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <div>
          {query.data ? (
            <>
              {query.data.count === 0
                ? "0 transactions"
                : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, query.data.count)} of ${query.data.count}`}
            </>
          ) : "—"}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 tabular-nums">{page + 1} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    overpaid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    underpaid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    pending: "bg-muted text-muted-foreground border-border",
    expired: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${map[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

function tickerForChain(chain?: string | null): string {
  if (!chain) return "";
  const c = chain.toLowerCase();
  if (c.includes("bitcoin") || c === "btc") return "BTC";
  if (c.includes("texit") || c === "txc") return "TXC";
  if (c.includes("litecoin") || c === "ltc") return "LTC";
  if (c.includes("ethereum") || c === "eth") return "ETH";
  if (c.includes("tron") || c === "trx") return "TRX";
  if (c.includes("solana") || c === "sol") return "SOL";
  if (c.includes("polygon") || c === "matic") return "MATIC";
  if (c.includes("base")) return "ETH";
  return chain.toUpperCase();
}

function formatCryptoAmount(amount: number | string, symbol?: string): string {
  const n = Number(amount);
  if (!isFinite(n)) return String(amount);
  const stables = new Set(["USDC", "USDT", "DAI", "PYUSD"]);
  const maxFrac = stables.has((symbol || "").toUpperCase()) ? 2 : 6;
  // Strip trailing zeros
  const fixed = n.toFixed(maxFrac);
  const trimmed = fixed.replace(/\.?0+$/, "");
  const [int, dec] = trimmed.split(".");
  const intFmt = Number(int).toLocaleString();
  return dec ? `${intFmt}.${dec}` : intFmt;
}

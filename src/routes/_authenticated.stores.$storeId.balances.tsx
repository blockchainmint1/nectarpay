import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ExternalLink, RefreshCw, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listBalanceChains, getChainBalances } from "@/lib/balances.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stores/$storeId/balances")({
  head: () => ({
    meta: [
      { title: "Wallet balances · Nectar.Pay" },
      {
        name: "description",
        content:
          "Live balances for every wallet linked to your store, broken down by receive address.",
      },
      { property: "og:title", content: "Wallet balances · Nectar.Pay" },
      {
        property: "og:description",
        content: "See what is sitting in each of your store's receive addresses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BalancesPage,
});

const PAGE_SIZE = 5;

function BalancesPage() {
  const { storeId } = Route.useParams();
  const loadChains = useServerFn(listBalanceChains);

  const { data, isLoading } = useQuery({
    queryKey: ["balance-chains", storeId],
    queryFn: () => loadChains({ data: { storeId } }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Wallet balances</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Read-only view of the money sitting in the wallets linked to this store. We only ever see
        your public keys, so we can show balances but never move anything.
      </p>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : !data?.chains.length ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          No wallets linked yet.{" "}
          <Link
            to="/stores/$storeId/chains"
            params={{ storeId }}
            className="text-primary hover:underline"
          >
            Add one
          </Link>
          .
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {data.chains.map((c) => (
            <ChainBalanceCard
              key={c.chain}
              storeId={storeId}
              chain={c.chain}
              name={c.name}
              derived={c.derived}
              nextIndex={c.nextIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChainBalanceCard({
  storeId,
  chain,
  name,
  derived,
  nextIndex,
}: {
  storeId: string;
  chain: string;
  name: string;
  derived: boolean;
  nextIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(1);
  const load = useServerFn(getChainBalances);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["chain-balances", storeId, chain, start],
    queryFn: () =>
      load({
        data: { storeId, chain, start: derived ? start : 0, count: derived ? PAGE_SIZE : 1 },
      }),
    enabled: open,
    staleTime: 30_000,
  });

  const highestUsed = Math.max(1, nextIndex - 1);

  return (
    <div className="rounded-lg border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-accent/50"
      >
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">
            {derived
              ? `Derived addresses · latest issued index ${highestUsed}`
              : "Single static receive address"}
          </div>
        </div>
        <div className="text-right">
          {open && data ? (
            <div className="text-sm font-medium">
              ${data.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="ml-1 text-xs font-normal text-muted-foreground">on this page</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{open ? "Loading…" : "Show detail"}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          {isFetching && !data ? (
            <div className="text-sm text-muted-foreground">Reading the blockchain…</div>
          ) : (
            <>
              <ul className="divide-y divide-border/70">
                {(data?.addresses ?? []).map((a) => (
                  <li key={a.address} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {derived && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            #{a.index}
                          </span>
                        )}
                        <span className="truncate font-mono text-xs">{a.address}</span>
                        {a.explorerUrl && (
                          <a
                            href={a.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {a.error
                          ? a.error
                          : [
                              a.native > 0 || a.tokens.length === 0
                                ? `${a.native.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${a.nativeSymbol}`
                                : null,
                              ...a.tokens.map(
                                (t) =>
                                  `${t.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${t.symbol}${t.network ? ` (${t.network})` : ""}`,
                              ),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                        {a.nativePending > 0 && ` · ${a.nativePending} pending`}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-sm",
                        a.usd > 0 ? "font-medium" : "text-muted-foreground",
                      )}
                    >
                      ${a.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn("mr-1 h-3 w-3", isFetching && "animate-spin")} />
                  Refresh
                </Button>
                {derived && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={start <= 1 || isFetching}
                      onClick={() => setStart((s) => Math.max(1, s - PAGE_SIZE))}
                    >
                      Previous 5
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      #{start}–{start + PAGE_SIZE - 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFetching}
                      onClick={() => setStart((s) => s + PAGE_SIZE)}
                    >
                      Next 5
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

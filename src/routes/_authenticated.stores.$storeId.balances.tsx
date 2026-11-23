import { useStoreRef } from "@/lib/store-ref";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/use-count-up";
import { useWalletScan } from "@/hooks/use-wallet-scan";
import type { BalanceChainSummary } from "@/lib/balances.functions";
import { cn } from "@/lib/utils";
import {
  addressAssets,
  assetColor,
  assetName,
  formatAmount,
  formatUsd,
  networkColor,
  type AssetTotal,
  type ChainScan,
  type ScanAddress,
} from "@/lib/wallet-assets";

export const Route = createFileRoute("/_authenticated/stores/$storeId/balances")({
  head: () => ({
    meta: [
      { title: "Wallet balances · Nectar.Pay" },
      {
        name: "description",
        content:
          "Live total of every wallet linked to your store, by coin, network and receive address.",
      },
      { property: "og:title", content: "Wallet balances · Nectar.Pay" },
      {
        property: "og:description",
        content: "See exactly what your store's wallets hold right now, coin by coin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BalancesPage,
});

const NETWORK_LABEL: Record<string, string> = { bsc: "BNB Chain" };
const netName = (c: BalanceChainSummary) => NETWORK_LABEL[c.chain] ?? c.name;

function BalancesPage() {
  const { storeId, storeSlug } = useStoreRef();
  const scan = useWalletScan(storeId);
  const { summary, chains } = scan;
  const animatedTotal = useCountUp(summary.usd);

  const linked = chains.filter((c) => c.configured);
  // Retired networks are only watched for mistakes: show them only when money is there.
  const shown = linked.filter(
    (c) => !c.retired || (summary.chains[c.chain]?.funded ?? 0) > 0 || scan.pendingChains.has(c.chain),
  );
  const ordered = scan.scanning
    ? shown
    : [...shown].sort((a, b) => (summary.chains[b.chain]?.usd ?? 0) - (summary.chains[a.chain]?.usd ?? 0));
  const notLinked = chains.filter((c) => !c.configured && !c.retired);
  const fundedNetworks = Object.values(summary.chains).filter((c) => c.funded > 0).length;
  const top = summary.assets[0];
  const sales = scan.paidSales;

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId: storeSlug }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      {/* Big total */}
      <section
        className="relative mt-5 overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 md:p-8"
        style={{ backgroundImage: "var(--gradient-honey-soft)", boxShadow: "var(--shadow-honey)" }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" /> In your wallets right now
            </h1>
            <div className="mt-3 font-display text-5xl font-semibold tracking-tight tabular-nums md:text-7xl">
              {formatUsd(animatedTotal)}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {scan.loadingChains
                ? "Finding your wallets…"
                : `${summary.funded.toLocaleString()} address${summary.funded === 1 ? "" : "es"} holding money on ${fundedNetworks} network${fundedNetworks === 1 ? "" : "s"} · ${summary.checked.toLocaleString()} checked`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[28rem]">
            <HeroStat
              label="Paid sales on record"
              value={sales ? sales.count.toLocaleString() : "—"}
              sub={sales && sales.allUsd ? `${formatUsd(sales.usd)} when paid` : "all-time"}
            />
            <HeroStat
              label="Biggest holding"
              value={top ? top.symbol : "—"}
              sub={top ? `${formatUsd(top.usd)} · ${assetName(top.symbol)}` : scan.scanning ? "Scanning…" : "Nothing yet"}
              dot={top ? assetColor(top.symbol) : undefined}
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round(scan.progress * 100)}%`, background: "var(--gradient-honey)" }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {scan.scanning
                ? `Reading the blockchains… ${scan.done} of ${scan.total || "?"} batches`
                : `Up to date${scan.updatedAt ? ` as of ${new Date(scan.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""} · today's prices`}
              {scan.failedChains.size > 0 || summary.failed > 0
                ? ` · some addresses didn't answer, try Refresh`
                : ""}
            </span>
            <Button variant="ghost" size="sm" className="h-7" onClick={scan.refresh} disabled={scan.fetching}>
              <RefreshCw className={cn("mr-1 h-3 w-3", scan.fetching && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Coin mix */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">What you're holding</h2>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted">
          {summary.usd > 0 &&
            summary.assets
              .filter((a) => a.usd > 0)
              .map((a) => (
                <div
                  key={a.symbol}
                  title={`${a.symbol} · ${formatUsd(a.usd)}`}
                  className="h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(a.usd / summary.usd) * 100}%`, background: assetColor(a.symbol) }}
                />
              ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.assets.map((a) => (
            <AssetTile key={a.symbol} asset={a} share={summary.usd ? a.usd / summary.usd : 0} />
          ))}
          {summary.assets.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {scan.scanning ? "Counting coins…" : "No coins found in the linked wallets yet."}
            </div>
          )}
        </div>
      </section>

      {/* Networks */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold tracking-tight">By network</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 [grid-auto-flow:dense]">
          {ordered.map((c) => (
            <NetworkCard
              key={c.chain}
              chain={c}
              scan={summary.chains[c.chain]}
              loading={scan.pendingChains.has(c.chain)}
              failed={scan.failedChains.has(c.chain)}
            />
          ))}
        </div>

        {notLinked.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Not linked yet:</span>
            {notLinked.map((c) => (
              <Link
                key={c.chain}
                to="/stores/$storeId/chains"
                params={{ storeId: storeSlug }}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> {netName(c)}
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 flex max-w-3xl items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        Read-only. We only ever see your public wallet keys, so we can count what's there but never
        move it. Junk tokens strangers send to your addresses are ignored. Totals use today's prices,
        so they can differ from what sales were worth when they were paid.
      </p>
    </div>
  );
}

function HeroStat({ label, value, sub, dot }: { label: string; value: string; sub: string; dot?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tabular-nums">
        {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />}
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function AssetTile({ asset, share }: { asset: AssetTotal; share: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: assetColor(asset.symbol) }} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{asset.symbol}</span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{assetName(asset.symbol)}</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(share * 100)}%</span>
      </div>
      <div className="mt-2 font-display text-xl font-semibold tabular-nums sm:text-2xl">
        {asset.priced ? formatUsd(asset.usd) : "No live price"}
      </div>
      <div className="mt-0.5 font-mono text-xs text-muted-foreground">
        {formatAmount(asset.amount)} {asset.symbol}
      </div>
    </div>
  );
}

function NetworkCard({
  chain,
  scan,
  loading,
  failed,
}: {
  chain: BalanceChainSummary;
  scan: ChainScan | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const usd = scan?.usd ?? 0;
  const color = networkColor(chain.chain);
  const checked = scan?.checked ?? chain.lastIndex - chain.firstIndex + 1;
  const checkedLabel = !chain.derived
    ? "One fixed address"
    : checked === 1
      ? `${scan?.funded ? "Its 1 address holds" : "Its 1 address is empty"}${scan?.funded ? " money" : ""}`
      : `${scan?.funded ?? 0} of ${checked} addresses hold money`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/60 transition-colors",
        open && "md:col-span-2 border-primary/30",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full rounded-2xl p-5 text-left hover:bg-accent/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-bold text-background"
              style={{ background: color }}
            >
              {chain.chain.toUpperCase().slice(0, 4)}
            </span>
            <div>
              <div className="font-medium">{netName(chain)}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {chain.retired ? (
                  <Badge>Watch only · mistaken payments</Badge>
                ) : !chain.enabled ? (
                  <Badge>Off for new sales</Badge>
                ) : null}
                {failed && <Badge tone="warn">Didn't answer</Badge>}
              </div>
            </div>
          </div>
          <div className="text-right">
            {loading && !scan ? (
              <div className="h-7 w-28 animate-pulse rounded bg-muted" />
            ) : (
              <div className={cn("font-display text-2xl font-semibold tabular-nums", usd === 0 && "text-muted-foreground")}>
                {formatUsd(usd)}
              </div>
            )}
            {loading && scan && <div className="text-[11px] text-muted-foreground">still counting…</div>}
          </div>
        </div>

        {scan && scan.assets.length > 0 && (
          <>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
              {usd > 0 &&
                scan.assets
                  .filter((a) => a.usd > 0)
                  .map((a) => (
                    <div
                      key={a.symbol}
                      className="h-full"
                      style={{ width: `${(a.usd / usd) * 100}%`, background: assetColor(a.symbol) }}
                    />
                  ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {scan.assets.map((a) => (
                <span
                  key={a.symbol}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-xs"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: assetColor(a.symbol) }} />
                  {formatAmount(a.amount)} {a.symbol}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{checkedLabel}</span>
          <span className="inline-flex items-center gap-1 text-primary">
            {open ? "Hide addresses" : "See addresses"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5">
          <AddressList chain={chain} scan={scan} loading={loading} />
        </div>
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: "warn" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
        tone === "warn" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function AddressList({
  chain,
  scan,
  loading,
}: {
  chain: BalanceChainSummary;
  scan: ChainScan | undefined;
  loading: boolean;
}) {
  const [showEmpty, setShowEmpty] = useState(false);
  if (!scan) {
    return <div className="pt-4 text-sm text-muted-foreground">Reading the blockchain…</div>;
  }
  const withValue = scan.addresses.map((a) => ({ a, held: addressAssets(a, {}) }));
  const funded = withValue
    .filter((x) => x.held.length > 0 || x.a.error)
    .sort((x, y) => y.a.usd - x.a.usd || x.a.index - y.a.index);
  const empty = withValue.filter((x) => x.held.length === 0 && !x.a.error);
  const max = Math.max(1, ...funded.map((x) => x.a.usd));

  return (
    <div>
      <ul className="divide-y divide-border/70">
        {funded.map(({ a }) => (
          <AddressRow key={a.address} a={a} derived={chain.derived} max={max} />
        ))}
        {showEmpty && empty.map(({ a }) => <AddressRow key={a.address} a={a} derived={chain.derived} max={max} />)}
      </ul>
      {funded.length === 0 && !showEmpty && (
        <div className="pt-4 text-sm text-muted-foreground">
          {loading ? "Still reading…" : "Nothing is sitting on this network right now."}
        </div>
      )}
      {empty.length > 0 && (
        <button
          type="button"
          onClick={() => setShowEmpty((s) => !s)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          {showEmpty ? "Hide empty addresses" : `Show ${empty.length} empty address${empty.length === 1 ? "" : "es"}`}
          <span className="ml-1 opacity-70">(already moved on, or never used)</span>
        </button>
      )}
    </div>
  );
}

function AddressRow({ a, derived, max }: { a: ScanAddress; derived: boolean; max: number }) {
  const [copied, setCopied] = useState(false);
  const held = addressAssets(a, {});
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-3">
      <span className="w-12 rounded-md bg-muted px-1.5 py-1 text-center font-mono text-[11px] text-muted-foreground">
        {derived ? `#${a.index}` : "main"}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-xs" title={a.address}>
            {a.address.length > 20 ? `${a.address.slice(0, 10)}…${a.address.slice(-8)}` : a.address}
          </span>
          <button type="button" onClick={copy} className="text-muted-foreground hover:text-foreground" aria-label="Copy address">
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
          {a.explorerUrl && (
            <a
              href={a.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Open in block explorer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {a.error ? (
            <span className="text-warning">Couldn't read this address right now</span>
          ) : held.length ? (
            held.map((h) => (
              <span key={h.symbol} className="inline-flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: assetColor(h.symbol) }} />
                {formatAmount(h.amount)} {h.symbol}
              </span>
            ))
          ) : (
            <span>Empty</span>
          )}
          {a.nativePending > 0 && <span className="text-primary">{formatAmount(a.nativePending)} still confirming</span>}
        </div>
      </div>
      <div className="w-28 text-right sm:w-40">
        <div className={cn("text-sm tabular-nums", a.usd > 0 ? "font-semibold" : "text-muted-foreground")}>
          {formatUsd(a.usd)}
        </div>
        {a.usd > 0 && (
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(a.usd / max) * 100}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}

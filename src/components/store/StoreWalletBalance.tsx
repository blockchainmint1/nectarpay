import { Link } from "@tanstack/react-router";
import { RefreshCw, Wallet } from "lucide-react";

import { useCountUp } from "@/hooks/use-count-up";
import { useWalletScan } from "@/hooks/use-wallet-scan";
import { assetColor, formatUsd } from "@/lib/wallet-assets";

/** Live total of every sale address on every linked network (shares the Wallet balances scan). */
export function StoreWalletBalance({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const scan = useWalletScan(storeId);
  const { summary } = scan;
  const total = useCountUp(summary.usd);
  const networks = Object.values(summary.chains).filter((c) => c.funded > 0).length;

  return (
    <div className="min-w-[15rem] rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 text-primary" /> Wallet balance
        </div>
        <button
          type="button"
          onClick={scan.refresh}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Refresh wallet balance"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${scan.fetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {summary.checked === 0 && scan.scanning ? "Scanning…" : formatUsd(total)}
      </div>
      {summary.usd > 0 && (
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
          {summary.assets
            .filter((a) => a.usd > 0)
            .map((a) => (
              <div
                key={a.symbol}
                title={`${a.symbol} · ${formatUsd(a.usd)}`}
                className="h-full transition-[width] duration-700"
                style={{ width: `${(a.usd / summary.usd) * 100}%`, background: assetColor(a.symbol) }}
              />
            ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {scan.scanning
            ? `Counting… ${Math.round(scan.progress * 100)}%`
            : `${summary.funded} address${summary.funded === 1 ? "" : "es"} on ${networks} network${networks === 1 ? "" : "s"}`}
          {!scan.scanning && scan.failedChains.size ? ` · ${scan.failedChains.size} not reachable` : ""}
        </span>
        <Link to="/stores/$storeId/balances" params={{ storeId: storeSlug }} className="text-primary hover:underline">
          Breakdown
        </Link>
      </div>
    </div>
  );
}

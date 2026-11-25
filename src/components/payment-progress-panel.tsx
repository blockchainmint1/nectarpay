import { useEffect, useState } from "react";
import { Check, Copy, Loader2, QrCode, RefreshCw } from "lucide-react";
import { buildProgressView, type WalletProgressInfo } from "@/lib/payment-progress";
import { cn } from "@/lib/utils";

export function PaymentProgressPanel({
  variant,
  invoiceStatus,
  walletProgress,
  onChainTxHash,
  confirmations,
  requiredConfs,
  onRefresh,
  onShowQr,
}: {
  variant: "pos" | "checkout";
  invoiceStatus: string;
  walletProgress?: WalletProgressInfo | null;
  onChainTxHash?: string | null;
  confirmations?: number | null;
  requiredConfs?: number | null;
  onRefresh?: () => Promise<void> | void;
  onShowQr?: () => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lineIdx, setLineIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  const view = buildProgressView({ invoiceStatus, walletProgress, onChainTxHash, nowMs });

  useEffect(() => {
    setLineIdx(0);
  }, [view.stage]);

  useEffect(() => {
    if (view.lines.length <= 1) return;
    const t = setInterval(() => setLineIdx((i) => (i + 1) % view.lines.length), 6_000);
    return () => clearInterval(t);
  }, [view.lines.length, view.stage]);

  if (!view.active) return null;

  const isPos = variant === "pos";
  const currentLine = view.lines[lineIdx % view.lines.length] ?? view.subheadline;
  const confPct =
    view.stage === "detected" && confirmations != null && requiredConfs
      ? Math.min(100, (confirmations / requiredConfs) * 100)
      : null;

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const handleCopyTx = () => {
    if (!view.txid) return;
    void navigator.clipboard?.writeText(view.txid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center rounded-2xl border p-5 text-center",
        isPos
          ? "max-w-sm border-amber-400/30 bg-amber-400/10 text-white"
          : "border-warning/30 bg-warning/5 text-foreground",
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full border",
          isPos ? "border-amber-400/40 bg-amber-400/15 text-amber-300" : "border-warning/30 bg-warning/10 text-warning",
        )}
      >
        <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />
      </div>

      {view.partnerName && (
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            isPos ? "bg-white/10 text-amber-200" : "bg-warning/15 text-warning",
          )}
        >
          <span className={cn("size-1.5 rounded-full animate-pulse", isPos ? "bg-amber-300" : "bg-warning")} />
          Live from {view.partnerName}
        </span>
      )}

      <h2 className="mt-2.5 text-lg font-bold tracking-tight">{view.headline}</h2>
      <p className={cn("mt-0.5 text-xs font-medium", isPos ? "text-amber-200/90" : "text-warning")}>{view.subheadline}</p>

      <div
        className={cn(
          "mt-3.5 w-full rounded-xl border px-3.5 py-3 text-sm leading-snug",
          isPos ? "border-white/10 bg-black/25 text-white/95" : "border-border/60 bg-background/70 text-foreground",
        )}
      >
        “{currentLine}”
      </div>

      {confPct !== null && (
        <div className="mt-3 w-full">
          <div className={cn("flex justify-between font-mono text-[11px]", isPos ? "text-white/70" : "text-muted-foreground")}>
            <span>Confirmations</span>
            <span>
              {confirmations} / {requiredConfs}
            </span>
          </div>
          <div className={cn("mt-1.5 h-1.5 overflow-hidden rounded-full", isPos ? "bg-white/10" : "bg-warning/15")}>
            <div className={cn("h-full rounded-full transition-[width] duration-700", isPos ? "bg-amber-400" : "bg-warning")} style={{ width: `${confPct}%` }} />
          </div>
        </div>
      )}

      {view.txid && (
        <button
          type="button"
          onClick={handleCopyTx}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition",
            isPos
              ? "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
              : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground",
          )}
          title="Copy transaction reference"
        >
          <span>
            Ref {view.txid.slice(0, 8)}…{view.txid.slice(-6)}
          </span>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      )}

      <p className={cn("mt-3 text-[11px] leading-snug", isPos ? "text-white/60" : "text-muted-foreground")}>
        Not confirmed yet — wait for the green Paid screen before handing over goods. Do not pay again.
      </p>

      <div className="mt-3.5 flex w-full flex-wrap items-center justify-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
              isPos
                ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            Check status
          </button>
        )}
        {onShowQr && (
          <button
            type="button"
            onClick={onShowQr}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              isPos
                ? "border-white/15 text-white/75 hover:bg-white/5"
                : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <QrCode className="size-3.5" />
            View original QR
          </button>
        )}
      </div>
    </div>
  );
}
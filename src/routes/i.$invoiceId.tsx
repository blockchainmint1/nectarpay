import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  Clock,
  Sparkles,
} from "lucide-react";

import { getPublicInvoice } from "@/lib/checkout.functions";
import { ALL_NETWORKS } from "@/lib/chains/networks";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { KycGate } from "@/components/kyc-gate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/i/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Pay invoice · payHME` },
      { name: "description", content: `Complete crypto payment for invoice ${params.invoiceId.slice(0, 8)}.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

// ---------- helpers ----------

const CHAIN_LABEL: Record<string, string> = {
  btc: "Bitcoin",
  txc: "TEXITcoin",
  eth: "Ethereum",
  base: "Base",
  tron: "Tron",
  sol: "Solana",
  doge: "Dogecoin",
  isk: "Iskander",
  zcu: "ZCU",
};

function chainAccent(chain: string): string {
  // Tailwind classes — keep within design tokens, just shift hue per chain.
  switch (chain) {
    case "btc":  return "from-orange-500/30 to-amber-400/10";
    case "txc":  return "from-primary/40 to-primary/5";
    case "eth":  return "from-indigo-500/30 to-sky-400/10";
    case "base": return "from-blue-500/30 to-cyan-400/10";
    case "tron": return "from-rose-500/30 to-red-400/10";
    case "sol":  return "from-fuchsia-500/30 to-violet-400/10";
    default:     return "from-primary/30 to-primary/5";
  }
}

function paymentUri(
  chain: string,
  address: string,
  amount: number | null,
  memo: string | null = null,
): string {
  if (chain === "btc") return `bitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "txc") return `texitcoin:${address}${amount ? `?amount=${amount}` : ""}`;
  if (chain === "eth" || chain === "base") return `ethereum:${address}`;
  if (chain === "tron") return `tron:${address}`;
  if (chain === "sol") {
    // Solana Pay URI: solana:<address>?amount=<sol>&memo=<text>&label=<text>
    const params = new URLSearchParams();
    if (amount) params.set("amount", String(amount));
    if (memo) {
      params.set("memo", memo);
      params.set("reference", memo);
    }
    params.set("label", "payHME");
    const qs = params.toString();
    return `solana:${address}${qs ? `?${qs}` : ""}`;
  }
  return address;
}


function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { expired: true, label: "Expired" };
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const h = Math.floor(m / 60);
  return {
    expired: false,
    label: h > 0 ? `${h}h ${m % 60}m` : `${m}:${String(s).padStart(2, "0")}`,
  };
}

function StatusPill({ status }: { status: string }) {
  const conf = {
    pending:   { label: "Waiting for payment", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground animate-pulse" },
    detected:  { label: "Payment detected",     cls: "bg-warning/15 text-warning",       dot: "bg-warning animate-pulse" },
    confirmed: { label: "Confirmed",            cls: "bg-success/15 text-success",       dot: "bg-success" },
    underpaid: { label: "Underpaid",            cls: "bg-warning/15 text-warning",       dot: "bg-warning" },
    overpaid:  { label: "Overpaid",             cls: "bg-success/15 text-success",       dot: "bg-success" },
    expired:   { label: "Expired",              cls: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
    cancelled: { label: "Cancelled",            cls: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
    failed:    { label: "Failed",               cls: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
  }[status] ?? { label: status, cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", conf.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
      {conf.label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : (label ?? "Copy")}
    </button>
  );
}

function QrCanvas({ value, dark }: { value: string; dark: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 280,
      color: {
        dark: dark ? "#f8fafc" : "#0f172a",
        light: "#00000000",
      },
    }).catch(() => {});
  }, [value, dark]);
  return <canvas ref={ref} className="h-[280px] w-[280px]" aria-label="Payment QR code" />;
}

// ---------- page ----------

function CheckoutPage() {
  const { invoiceId } = useParams({ from: "/i/$invoiceId" });
  const fetchInvoice = useServerFn(getPublicInvoice);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const { data, error, isLoading } = useQuery({
    queryKey: ["public-invoice", invoiceId],
    queryFn: () => fetchInvoice({ data: { id: invoiceId } }),
    refetchInterval: (q) => {
      const d = q.state.data as Awaited<ReturnType<typeof fetchInvoice>> | undefined;
      if (!d || !d.found) return false;
      // Stop polling on terminal states.
      const terminal = ["confirmed", "expired", "cancelled", "failed", "overpaid"];
      return terminal.includes(d.invoice.status) ? false : 6000;
    },
    refetchOnWindowFocus: true,
  });

  const inv = data?.found ? data.invoice : null;
  const txs = data?.found ? data.transactions : [];
  const store = data?.found ? data.store : null;

  // SDK postMessage: when embedded in the payHME iframe modal, notify the parent
  // window on terminal status transitions so merchants can listen for "paid".
  const lastStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!inv) return;
    if (lastStatusRef.current === inv.status) return;
    lastStatusRef.current = inv.status;
    if (typeof window === "undefined" || window.parent === window) return;
    if (inv.status === "confirmed" || inv.status === "overpaid") {
      window.parent.postMessage({ source: "payhme", type: "paid", invoiceId: inv.id, tx: txs[0]?.hash ?? null }, "*");
    } else if (inv.status === "expired" || inv.status === "cancelled" || inv.status === "failed") {
      window.parent.postMessage({ source: "payhme", type: "expired", invoiceId: inv.id, status: inv.status }, "*");
    }
  }, [inv, txs]);

  const countdown = useCountdown(inv?.expiresAt ?? null);
  const network = inv ? (ALL_NETWORKS as Record<string, { confirmationsRequired: number }>)[inv.chain] : null;
  const requiredConfs = network?.confirmationsRequired ?? 1;

  const memo = inv ? inv.id.slice(0, 8) : null;
  const uri = useMemo(
    () => (inv ? paymentUri(inv.chain, inv.address, inv.cryptoAmount, memo) : ""),
    [inv, memo],
  );


  // ----- frames -----
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div
        className={cn(
          "pointer-events-none absolute -top-40 left-1/2 -z-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full blur-3xl",
          "bg-gradient-to-br opacity-60",
          inv ? chainAccent(inv.chain) : "from-primary/30 to-primary/5",
        )}
      />

      {/* top bar */}
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          pay<span className="text-primary">HME</span>
          {store && (
            <span className="ml-3 hidden text-muted-foreground sm:inline">
              for <span className="text-foreground">{store.name}</span>
            </span>
          )}
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16">
        {isLoading && (
          <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading invoice…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            <p className="font-medium">Could not load this invoice.</p>
            <p className="mt-1 text-sm opacity-80">{(error as Error).message}</p>
          </div>
        )}

        {data && !data.found && (
          <div className="mt-12 rounded-2xl border border-border/60 bg-card p-10 text-center">
            <TriangleAlert className="mx-auto h-10 w-10 text-warning" />
            <h1 className="mt-4 text-xl font-semibold">Invoice not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The link may be wrong or the invoice may have been removed.
            </p>
          </div>
        )}

        {inv && (
          <div className="space-y-6">
            <KycGate invoiceId={inv.id} onPassed={() => { /* unlocked */ }} />
            {/* hero card */}
            <section
              className={cn(
                "relative overflow-hidden rounded-3xl border border-border/60",
                "bg-card/70 backdrop-blur-xl shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5)]",
              )}
            >
              {/* shimmer line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {/* SUCCESS STATE */}
              {(inv.status === "confirmed" || inv.status === "overpaid") && (
                <SuccessFrame inv={inv} txs={txs} store={store} />
              )}

              {/* EXPIRED / CANCELLED / FAILED */}
              {(inv.status === "expired" || inv.status === "cancelled" || inv.status === "failed") && (
                <TerminalFrame status={inv.status} />
              )}

              {/* PAYING STATE (pending / detected / underpaid) */}
              {(inv.status === "pending" || inv.status === "detected" || inv.status === "underpaid") && (
                <PayingFrame
                  inv={inv}
                  uri={uri}
                  isDark={isDark}
                  countdown={countdown}
                  txs={txs}
                  requiredConfs={requiredConfs}
                />
              )}
            </section>

            {/* footer trust strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Non-custodial — funds go straight to the merchant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by payHME
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------- frames ----------

type Invoice = NonNullable<ReturnType<typeof useInvoiceType>>;
function useInvoiceType() {
  return null as null | {
    id: string;
    chain: string;
    fiatAmount: number;
    fiatCurrency: string;
    cryptoAmount: number | null;
    rate: number | null;
    address: string;
    status: string;
    description: string | null;
    redirectUrl: string | null;
    expiresAt: string | null;
    createdAt: string;
  };
}

type Tx = {
  hash: string;
  amount: number | null;
  confirmations: number;
  confirmedAt: string | null;
  firstSeenAt: string | null;
};

function PayingFrame({
  inv,
  uri,
  isDark,
  countdown,
  txs,
  requiredConfs,
}: {
  inv: Invoice;
  uri: string;
  isDark: boolean;
  countdown: ReturnType<typeof useCountdown>;
  txs: Tx[];
  requiredConfs: number;
}) {
  const isDetected = inv.status === "detected" || inv.status === "underpaid";
  const latestTx = txs[0];
  const progress = latestTx ? Math.min(100, (latestTx.confirmations / requiredConfs) * 100) : 0;

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_320px]">
      {/* left: amount + address */}
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between">
          <StatusPill status={inv.status} />
          {countdown && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-xs",
                countdown.expired ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {countdown.expired ? "Expired" : `Expires in ${countdown.label}`}
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Amount due</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono text-4xl font-semibold tracking-tight md:text-5xl">
              {inv.cryptoAmount != null ? inv.cryptoAmount : "—"}
            </span>
            <span className="text-lg font-medium text-muted-foreground">{inv.chain.toUpperCase()}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ≈ {inv.fiatAmount.toFixed(2)} {inv.fiatCurrency.toUpperCase()}
            {inv.rate ? <span className="ml-2 opacity-60">@ {inv.rate.toLocaleString()}</span> : null}
          </p>
        </div>

        {inv.description && (
          <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{inv.description}</p>
        )}

        {/* address */}
        <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {CHAIN_LABEL[inv.chain] ?? inv.chain} address
            </span>
            <CopyButton value={inv.address} />
          </div>
          <p className="mt-2 break-all font-mono text-sm leading-relaxed text-foreground/90">
            {inv.address}
          </p>
        </div>

        {/* memo for solana */}
        {inv.chain === "sol" && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-primary">Required memo</span>
              <CopyButton value={inv.id.slice(0, 8)} label="Copy memo" />
            </div>
            <p className="mt-2 font-mono text-sm">{inv.id.slice(0, 8)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste this in your wallet's memo field so we can match the payment to this invoice.
            </p>
          </div>
        )}

        {/* detection progress */}
        {isDetected && latestTx && (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-warning">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Confirming on-chain
              </span>
              <span className="font-mono text-muted-foreground">
                {latestTx.confirmations} / {requiredConfs}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-warning/10">
              <div
                className="h-full rounded-full bg-warning transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
              tx {latestTx.hash}
            </p>
          </div>
        )}
      </div>

      {/* right: QR + open-in-wallet */}
      <div className="flex flex-col items-center justify-center gap-4 border-t border-border/60 bg-background/30 p-6 md:border-l md:border-t-0 md:p-8">
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          <QrCanvas value={uri} dark={isDark} />
        </div>
        <a
          href={uri}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:translate-y-[-1px]"
        >
          <Wallet className="h-4 w-4" />
          Open in wallet
        </a>
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          Scan with your phone or tap to open your installed {CHAIN_LABEL[inv.chain] ?? "crypto"} wallet.
        </p>
      </div>
    </div>
  );
}

function SuccessFrame({ inv, txs, store }: { inv: Invoice; txs: Tx[]; store: { name: string; website: string | null } | null }) {
  const tx = txs[0];
  useEffect(() => {
    if (inv.redirectUrl) {
      const t = setTimeout(() => { window.location.href = inv.redirectUrl!; }, 4000);
      return () => clearTimeout(t);
    }
  }, [inv.redirectUrl]);

  return (
    <div className="relative p-8 text-center md:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-8 ring-success/5">
        <Check className="h-8 w-8 text-success" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">Payment received</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thank you{store ? ` — ${store.name} has been notified` : ""}.
      </p>

      <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-left">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {inv.cryptoAmount} <span className="text-sm text-muted-foreground">{inv.chain.toUpperCase()}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Value</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            {inv.fiatAmount.toFixed(2)} <span className="text-sm text-muted-foreground">{inv.fiatCurrency.toUpperCase()}</span>
          </p>
        </div>
      </div>

      {tx && (
        <p className="mt-5 break-all font-mono text-[11px] text-muted-foreground">
          tx {tx.hash}
        </p>
      )}

      {inv.redirectUrl && (
        <div className="mt-6">
          <Button asChild>
            <a href={inv.redirectUrl}>
              Continue <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Redirecting in a few seconds…</p>
        </div>
      )}
    </div>
  );
}

function TerminalFrame({ status }: { status: string }) {
  const copy = {
    expired:   { title: "Invoice expired",  body: "This payment window has closed. Ask the merchant to issue a new invoice." },
    cancelled: { title: "Invoice cancelled", body: "The merchant cancelled this invoice." },
    failed:    { title: "Payment failed",    body: "Something went wrong. Contact the merchant for help." },
  }[status] ?? { title: "Unavailable", body: "" };

  return (
    <div className="p-10 text-center">
      <TriangleAlert className="mx-auto h-10 w-10 text-destructive" />
      <h1 className="mt-4 text-xl font-semibold">{copy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
    </div>
  );
}

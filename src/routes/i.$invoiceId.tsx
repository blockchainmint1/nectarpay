import { useEffect, useRef, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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

import { getPublicInvoice, selectInvoiceChain, type CheckoutPaymentOption } from "@/lib/checkout.functions";
import { ALL_NETWORKS } from "@/lib/chains/networks";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { KycGate } from "@/components/kyc-gate";
import { cn } from "@/lib/utils";
import { qrToCanvas } from "@/lib/qr";

export const Route = createFileRoute("/i/$invoiceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Pay invoice · Nectar.Pay` },
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

// For stablecoins on the shared EVM xpub (chain="eth"), the derived address
// works across every EVM network we scan — show "EVM" instead of "Ethereum"
// so customers don't think it's Ethereum mainnet only.
function chainLabelFor(chain: string, tokenSymbol: string | null | undefined): string {
  if (tokenSymbol && chain === "eth") return "EVM";
  return CHAIN_LABEL[chain] ?? chain;
}
function chainShortFor(chain: string, tokenSymbol: string | null | undefined): string {
  if (tokenSymbol && chain === "eth") return "EVM";
  return chain.toUpperCase();
}

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

import { buildPaymentUri } from "@/lib/payment-uri";
function paymentUri(
  chain: string,
  address: string,
  amount: number | null,
  tokenSymbol: string | null = null,
): string {
  return buildPaymentUri(chain, address, amount, tokenSymbol);
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
    qrToCanvas(ref.current, value, {
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
      return terminal.includes(d.invoice.status) ? false : 1500;
    },
    refetchOnWindowFocus: true,
  });

  const inv = data?.found ? data.invoice : null;
  const txs = data?.found ? data.transactions : [];
  const store = data?.found ? data.store : null;
  const availableOptions: CheckoutPaymentOption[] = data?.found ? data.availableOptions : [];

  // SDK postMessage: when embedded in the Nectar.Pay iframe modal, notify the parent
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
  const network = inv?.chain
    ? (ALL_NETWORKS as Record<string, { confirmationsRequired: number }>)[inv.chain]
    : null;
  const requiredConfs = network?.confirmationsRequired ?? 1;

  const memo = inv ? inv.id.slice(0, 8) : null;




  // ----- frames -----
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div
        className={cn(
          "pointer-events-none absolute -top-40 left-1/2 -z-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full blur-3xl",
          "bg-gradient-to-br opacity-60",
          inv?.chain ? chainAccent(inv.chain) : "from-primary/30 to-primary/5",
        )}
      />

      {/* top bar */}
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary glow" />
          Nectar<span className="text-primary">-PAY</span>
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
              {(inv.status === "confirmed" || inv.status === "overpaid") && inv.chain && (
                <SuccessFrame inv={inv as Invoice} txs={txs} store={store} />
              )}

              {/* EXPIRED / CANCELLED / FAILED */}
              {(inv.status === "expired" || inv.status === "cancelled" || inv.status === "failed") && (
                <TerminalFrame status={inv.status} />
              )}

              {/* CHAIN-PICKER STATE (merchant didn't pre-select) */}
              {(inv.status === "pending" || inv.status === "detected" || inv.status === "underpaid") &&
                !inv.chain && (
                  <ChainPickerFrame
                    invoiceId={inv.id}
                    fiatAmount={inv.fiatAmount}
                    fiatCurrency={inv.fiatCurrency}
                    description={inv.description}
                    countdown={countdown}
                    availableOptions={availableOptions}
                  />
                )}

              {/* PAYING STATE (pending / detected / underpaid) */}
              {(inv.status === "pending" || inv.status === "detected" || inv.status === "underpaid") &&
                inv.chain && inv.address && (
                  <PayingFrame
                    inv={inv as Invoice}
                    memo={memo}
                    isDark={isDark}
                    countdown={countdown}
                    txs={txs}
                    requiredConfs={requiredConfs}
                    availableOptions={availableOptions}
                    canSwitchChain={inv.status === "pending" && txs.length === 0}
                  />

                )}

            </section>

            {/* footer trust strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Non-custodial — funds go straight to the merchant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Nectar.Pay
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
    tokenSymbol: string | null;
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
  memo,
  isDark,
  countdown,
  txs,
  requiredConfs,
  availableOptions,
  canSwitchChain,
}: {
  inv: Invoice;
  memo: string | null;
  isDark: boolean;
  countdown: ReturnType<typeof useCountdown>;
  txs: Tx[];
  requiredConfs: number;
  availableOptions: CheckoutPaymentOption[];
  canSwitchChain: boolean;
}) {
  const isDetected = inv.status === "detected" || inv.status === "underpaid";
  const latestTx = txs[0];
  const progress = latestTx ? Math.min(100, (latestTx.confirmations / requiredConfs) * 100) : 0;
  const selectChain = useServerFn(selectInvoiceChain);
  const [switching, setSwitching] = useState<string | null>(null);

  const currentKey = inv.tokenSymbol ? `${inv.chain}:${inv.tokenSymbol}` : inv.chain;
  const otherOptions = availableOptions.filter((o) => o.key !== currentKey);
  const showSwitch = canSwitchChain && otherOptions.length > 0;

  async function onSwitchTo(option: string) {
    setSwitching(option);
    try {
      await selectChain({ data: { id: inv.id, option } });
      // Polling query refetches with the new chain/token/address/amount.
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not switch option.");
    } finally {
      setSwitching(null);
    }
  }

  // Customer-side QR format toggle. Some wallets can't parse the chain URI
  // (e.g. `texitcoin:…?amount=…`) and need the bare address instead. Persisted
  // per browser so a customer who flips it once doesn't have to do it again.
  const [addressOnlyQr, setAddressOnlyQr] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("payhme.qrAddressOnly") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("payhme.qrAddressOnly", addressOnlyQr ? "1" : "0");
  }, [addressOnlyQr]);

  const uri = addressOnlyQr
    ? inv.address
    : paymentUri(inv.chain, inv.address, inv.cryptoAmount, inv.tokenSymbol);



  return (
    <div className="grid gap-0 md:grid-cols-[1fr_320px]">
      <h1 className="sr-only">Pay invoice</h1>

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
            <span className="text-lg font-medium text-muted-foreground">
              {inv.tokenSymbol ? inv.tokenSymbol : inv.chain.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ≈ {inv.fiatAmount.toFixed(2)} {inv.fiatCurrency.toUpperCase()}
            {inv.rate ? <span className="ml-2 opacity-60">@ {inv.rate.toLocaleString()}</span> : null}
            {inv.tokenSymbol && (
              <span className="ml-2 opacity-60">· on {chainLabelFor(inv.chain, inv.tokenSymbol)}</span>
            )}
          </p>
        </div>

        {inv.description && (
          <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{inv.description}</p>
        )}

        {/* address */}
        <div className="mt-6 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {inv.tokenSymbol
                ? `${inv.tokenSymbol} (${chainLabelFor(inv.chain, inv.tokenSymbol)}) address`
                : `${chainLabelFor(inv.chain, inv.tokenSymbol)} address`}
            </span>
            <CopyButton value={inv.address} />
          </div>
          <p className="mt-2 break-all font-mono text-sm leading-relaxed text-foreground/90">
            {inv.address}
          </p>
        </div>

        {/* alternate payment options */}
        {showSwitch && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Or pay with
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {otherOptions.map((o) => {
                const busy = switching === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onSwitchTo(o.key)}
                    disabled={switching !== null}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full bg-gradient-to-br",
                          chainAccent(o.chain),
                        )}
                      />
                      {o.label}
                      <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">
                        {o.tokenSymbol ? `${o.tokenSymbol}·${chainShortFor(o.chain, o.tokenSymbol)}` : o.chain}
                      </span>
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary">
                      {busy ? "Switching…" : "Use →"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
          Scan with your phone or tap to open your installed {inv.tokenSymbol && inv.chain === "eth" ? "EVM" : (CHAIN_LABEL[inv.chain] ?? "crypto")} wallet.
        </p>

        <label className="mt-1 flex w-full cursor-pointer items-start gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-left">
          <input
            type="checkbox"
            checked={addressOnlyQr}
            onChange={(e) => setAddressOnlyQr(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <span className="text-[11px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">Address-only QR.</span> Turn on if your wallet
            won't scan — it'll get just the address, and you enter the chain &amp; amount yourself.
          </span>
        </label>

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

function ChainPickerFrame({
  invoiceId,
  fiatAmount,
  fiatCurrency,
  description,
  countdown,
  availableOptions,
}: {
  invoiceId: string;
  fiatAmount: number;
  fiatCurrency: string;
  description: string | null;
  countdown: ReturnType<typeof useCountdown>;
  availableOptions: CheckoutPaymentOption[];
}) {
  const selectChain = useServerFn(selectInvoiceChain);
  const [picking, setPicking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pick(optionKey: string) {
    setErr(null);
    setPicking(optionKey);
    try {
      await selectChain({ data: { id: invoiceId, option: optionKey } });
      // Polling query will refetch and the page will switch to PayingFrame.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not select option.");
      setPicking(null);
    }
  }

  return (
    <div className="p-6 md:p-10">
      <h1 className="sr-only">Select payment method</h1>

      <div className="flex items-center justify-between">
        <StatusPill status="pending" />
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
            {fiatAmount.toFixed(2)}
          </span>
          <span className="text-lg font-medium text-muted-foreground">
            {fiatCurrency.toUpperCase()}
          </span>
        </div>
        {description && (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="mt-7">
        <p className="text-sm font-medium">Choose how you'd like to pay</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a network or stablecoin — we'll generate a payment address for you.
        </p>

        {availableOptions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            This merchant hasn't enabled any payment options yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableOptions.map((o) => {
              const isLoading = picking === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  disabled={picking !== null}
                  onClick={() => pick(o.key)}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 text-left transition-all",
                    "hover:border-primary/60 hover:bg-card disabled:opacity-50",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{o.label}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {o.tokenSymbol ? `${o.tokenSymbol} · ${chainShortFor(o.chain, o.tokenSymbol)}` : o.chain}
                    </p>
                  </div>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Wallet className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {err && (
          <p className="mt-3 text-xs text-destructive">{err}</p>
        )}
      </div>
    </div>
  );
}

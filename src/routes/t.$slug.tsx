// /t/$slug — the public "virtual terminal". A persistent, re-shareable
// link that looks like a Senraise POS terminal and runs the real payment
// flow against the merchant's linked wallets.
//
//   /t/ron-paul-institute            → visitor picks an amount
//   /t/ron-paul-institute?amount=50  → pre-filled charge

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Loader2, Maximize2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { getPublicTerminal, createPublicTerminalInvoice } from "@/lib/public-terminal.functions";
import { TerminalFrame } from "@/components/terminal-frame";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  note: z.string().max(200).optional(),
  /** "terminal" = POS bezel, "full" = normal responsive page. */
  view: z.enum(["terminal", "full"]).optional(),
});


export const Route = createFileRoute("/t/$slug")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Pay with crypto · Nectar.Pay` },
      {
        name: "description",
        content: `Send a crypto payment or donation securely — no account needed. Terminal ${params.slug}.`,
      },
      { property: "og:title", content: "Pay with crypto · Nectar.Pay" },
      {
        property: "og:description",
        content: "Scan, pick your coin, and pay. Non-custodial crypto payments powered by Nectar.Pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VirtualTerminalPage,
});

function VirtualTerminalPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const load = useServerFn(getPublicTerminal);
  const charge = useServerFn(createPublicTerminalInvoice);

  const { data: terminal, isLoading } = useQuery({
    queryKey: ["public-terminal", slug],
    queryFn: () => load({ data: { slug } }),
  });

  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (search.amount) setAmount(String(search.amount));
  }, [search.amount]);

  const currency = terminal?.currency ?? "USD";
  const value = useMemo(() => Number(amount) || 0, [amount]);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  const start = async (v: number) => {
    if (busy || v <= 0) return;
    setBusy(true);
    try {
      const res = await charge({ data: { slug, amount: v, note: search.note } });
      setInvoiceId(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  };

  const screen = isLoading ? (
    <div className="flex h-full items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ) : !terminal ? (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="font-medium">Link not available</p>
      <p className="text-sm text-muted-foreground">
        This payment terminal has been turned off by the merchant.
      </p>
    </div>
  ) : (
    <div className="flex h-full flex-col px-5 py-6">
      {terminal.logo_url && (
        <img
          src={terminal.logo_url}
          alt={`${terminal.store_name ?? "Merchant"} logo`}
          className="mx-auto mb-4 h-12 w-auto object-contain"
          loading="lazy"
        />
      )}

      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {terminal.is_donation ? "Donation amount" : "Amount due"}
        </p>
        <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{fmt(value)}</p>
      </div>

      {terminal.preset_amounts.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-2">
          {terminal.preset_amounts.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-medium transition-colors ${
                value === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {fmt(p)}
            </button>
          ))}
        </div>
      )}

      {terminal.allow_custom_amount && (
        <div className="mt-5">
          <label htmlFor="custom-amount" className="text-xs text-muted-foreground">
            Other amount ({currency})
          </label>
          <input
            id="custom-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0.00"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-lg tabular-nums outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="mt-auto pt-6">
        <Button
          className="h-14 w-full text-base"
          disabled={value < terminal.min_amount || value > terminal.max_amount || busy}
          onClick={() => start(value)}
        >
          {busy ? "Starting…" : `${terminal.cta_label} ${value > 0 ? fmt(value) : ""}`.trim()}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Non-custodial · paid straight to the merchant
        </p>
      </div>
    </div>
  );

  const heading = (
    <div className="mx-auto max-w-md shrink-0 text-center">
      <h1 className="text-lg font-semibold tracking-tight">
        {terminal?.title ?? (isLoading ? "Loading…" : "Payment terminal")}
      </h1>
      {terminal?.subtitle && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{terminal.subtitle}</p>
      )}
    </div>
  );

  const footer = (
    <p className="shrink-0 text-center text-xs text-muted-foreground">
      Powered by{" "}
      <a href="https://nectar-pay.com" className="underline underline-offset-2">
        Nectar.Pay
      </a>{" "}
      · part of the{" "}
      <a href="https://honest.money" className="underline underline-offset-2">
        honest.money
      </a>{" "}
      ecosystem
    </p>
  );

  const switchTo = (next: "full" | "terminal") =>
    navigate({ to: "/t/$slug", params: { slug }, search: { ...search, view: next } });

  // ---- Full-site experience (default on phones) -------------------------
  if (view === "full") {
    return (
      <main className="min-h-dvh bg-gradient-to-b from-muted/40 to-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          {heading}
          <div className="rounded-3xl border border-border bg-card shadow-sm">{screen}</div>
          <button
            onClick={() => switchTo("terminal")}
            className="mx-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4"
          >
            <Smartphone className="h-3.5 w-3.5" /> View as a POS terminal
          </button>
          {footer}
        </div>
      </main>
    );
  }

  // ---- Terminal bezel experience ---------------------------------------
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-muted/40 to-background px-4 py-6">
      {heading}

      <TerminalFrame
        className="shrink-0"
        label={terminal?.store_name ?? "Nectar.Pay"}
        scroll={!invoiceId}
      >
        {invoiceId ? (
          <iframe title="Payment" src={`/i/${invoiceId}`} className="h-full w-full border-0" />
        ) : (
          screen
        )}
      </TerminalFrame>

      <button
        onClick={() => switchTo("full")}
        className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4"
      >
        <Maximize2 className="h-3.5 w-3.5" /> Open the full-screen experience
      </button>

      {footer}
    </main>
  );
}


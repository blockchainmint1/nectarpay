import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Hexagon, Printer, Snowflake, Zap } from "lucide-react";
import posTerminalAsset from "@/assets/nectar-pos-terminal.jpg.asset.json";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · Nectar.Pay" },
      {
        name: "description",
        content:
          "Free, Cheap ($19/mo), or Unlimited ($99/mo) — all paid in TEXITcoin. Non-custodial. No monthly minimums.",
      },
      { property: "og:title", content: "Pricing · Nectar.Pay" },
      {
        property: "og:description",
        content: "Free, $19/mo, or $99/mo. Pay in TEXITcoin. Non-custodial settlement.",
      },
          { property: "og:url", content: "https://nectar-pay.com/pricing" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Pricing.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Three membership plans. All paid in TEXITcoin. Funds always settle straight to your
            wallet — we never touch them.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PlanCard
              name="Free"
              price="$0"
              priceSuffix=""
              tagline="Get started. Limited transactions per month."
              cta="Start free"
              features={[
                "Limited transactions per month",
                "BTC, TEXITcoin, USDC/USDT (Ethereum + Base)",
                "Merchant dashboard",
                "WooCommerce plugin",
                "Webhook delivery + retry",
                "KYC-optional checkout",
                "Community support",
              ]}
              footnote="Monthly transaction limit set by us — designed for hobby stores and pilots."
            />
            <PlanCard
              name="Cheap"
              price="$19"
              priceSuffix="/mo"
              tagline="Unlimited transactions. No caps."
              cta="Be Cheap"
              highlight
              features={[
                "Everything in Free",
                "Unlimited transactions",
                "Point of Sale terminal support",
                "CSV export (invoices, payouts)",
                "Reports & analytics",
                "Multiple stores",
                "API keys & webhooks",
                "Email support",
              ]}
              footnote="Billed monthly in TEXITcoin. Pay from any TXC wallet."
            />
            <PlanCard
              name="Unlimited"
              price="$99"
              priceSuffix="/mo"
              tagline="No transaction caps. Built for scale."
              cta="Go Unlimited"
              features={[
                "Everything in Cheap",
                "Advanced APIs (REST + WebSocket)",
                "Customized chain support",
                "Expanded chain coverage",
                "SLA-backed webhook delivery",
                "Team seats + audit log",
                "Custom KYC rules",
                "Priority support",
                "Dedicated account manager",
              ]}
              footnote="Billed monthly in TEXITcoin. Cancel anytime."
            />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            All plans paid in TEXITcoin. Transaction limits on Free are managed by our team and
            may change as the network grows.
          </p>
        </div>
      </section>

      <TerminalKitSection />

      <MarketingFooter />
    </div>
  );
}

function TerminalKitSection() {
  const kitUrl =
    "https://blockchainmint.com/buy/nectar-pay-mobile-pos-terminal?clear=1";
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-[#0b1425] py-20 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'><polygon points='30,1 59,17 59,35 30,51 1,35 1,17' fill='none' stroke='%23F6A21E' stroke-width='1'/></svg>\")",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/5 px-3 py-1 text-xs text-amber-300">
            <Hexagon className="h-3.5 w-3.5" />
            Merchant Start-up Kit · Ships from Blockchain Mint
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Open the box. <span className="text-amber-400">Start taking crypto.</span>
          </h2>
          <p className="mt-4 max-w-lg text-white/70">
            Everything a shop needs to go non-custodial in an afternoon — the countertop
            terminal, a cold-storage coin that <em>is</em> your wallet, and a receipt printer
            that turns every sale into a paper trail your customer walks out with.
          </p>

          <div className="mt-8 space-y-5">
            <KitItem
              icon={<Printer className="h-5 w-5" />}
              title="NectarPay Mobile POS Terminal"
              body="Android-based, 4G + Wi-Fi, built-in thermal QR printer. Boots straight into the NectarPay POS."
            />
            <KitItem
              icon={<Snowflake className="h-5 w-5" />}
              title="BeeKeeper Cold Storage Coin"
              body="A physically-minted coin holding the xpub seed for the terminal. Air-gapped, tamper-evident, yours forever."
            />
            <KitItem
              icon={<Zap className="h-5 w-5" />}
              title="Ready to provision & pair"
              body="Arrives ready to link to your Nectar-Pay account. No messy config required — scan, link, take your first payment."
            />
          </div>

          <div className="mt-10 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-mono text-5xl text-amber-400">$495</div>
              <div className="mt-1 text-[11px] tracking-widest text-white/60">
                ONE-TIME · NO PER-TX FEES, EVER
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              <a href={kitUrl} target="_blank" rel="noreferrer">
                Claim your kit <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/50">
            Checkout on{" "}
            <a
              href="https://blockchainmint.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-amber-400/60 underline-offset-2 hover:text-white"
            >
              blockchainmint.com
            </a>{" "}
            · ships worldwide
          </p>
        </div>

        <a
          href={kitUrl}
          target="_blank"
          rel="noreferrer"
          className="group relative block rounded-2xl border border-white/10 bg-black/40 p-3 shadow-2xl shadow-amber-500/10 transition hover:-translate-y-1 hover:border-amber-400/40"
        >
          <img
            src={posTerminalAsset.url}
            alt="NectarPay POS terminal with BeeKeeper cold-storage coin and printed QR receipt"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
          <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-white/60">
            <span>NectarPay POS · BeeKeeper Coin · QR receipts</span>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition">
              $495 →
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}

function KitItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-sm text-white/60">{body}</div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  priceSuffix,
  tagline,
  cta,
  features,
  highlight,
  footnote,
}: {
  name: string;
  price: string;
  priceSuffix: string;
  tagline: string;
  cta: string;
  features: string[];
  highlight?: boolean;
  footnote?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card/60"
      }`}
    >
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {name}
      </h2>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-4xl tracking-tight">{price}</span>
        {priceSuffix ? (
          <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex-1" />
      <Button asChild className="mt-2 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/signup">{cta}</Link>
      </Button>
      {footnote ? (
        <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}

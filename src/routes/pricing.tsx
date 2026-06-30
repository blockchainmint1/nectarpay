import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

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
                "Priority new chain support",
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
      <MarketingFooter />
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
        <Link to="/auth" search={{ mode: "signup" }}>{cta}</Link>
      </Button>
      {footnote ? (
        <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}

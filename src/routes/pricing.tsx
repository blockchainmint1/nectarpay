import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · TEXITcoin Pay" },
      {
        name: "description",
        content:
          "Free during public beta. Simple flat fee per settled invoice. No monthly minimums.",
      },
      { property: "og:title", content: "Pricing · TEXITcoin Pay" },
      {
        property: "og:description",
        content: "Free during public beta. Flat fee per settled invoice afterwards.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Pricing.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            We make money when your store does. Free during public beta — no card required.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <PlanCard
              name="Beta"
              price="Free"
              tagline="While we're in public beta."
              cta="Start now"
              highlight
              features={[
                "Unlimited invoices",
                "BTC, TXC, USDC/USDT (Ethereum + Base)",
                "WooCommerce plugin",
                "Webhook delivery + retry",
                "Email support",
              ]}
            />
            <PlanCard
              name="Production"
              price="0.5%"
              tagline="Per settled invoice once we exit beta. No monthly minimums."
              cta="Talk to us"
              features={[
                "Everything in Beta",
                "Priority chain support",
                "SLA-backed webhook delivery",
                "Team seats and audit log",
              ]}
            />
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  cta,
  features,
  highlight,
}: {
  name: string;
  price: string;
  tagline: string;
  cta: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card/60"
      }`}
    >
      <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {name}
      </div>
      <div className="mt-2 font-mono text-4xl tracking-tight">{price}</div>
      <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/auth" search={{ mode: "signup" }}>{cta}</Link>
      </Button>
    </div>
  );
}

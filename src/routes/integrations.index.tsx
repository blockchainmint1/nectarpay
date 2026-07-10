import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag, Code2, Zap } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integrations/")({
  head: () => ({
    meta: [
      { title: "Integrations · Nectar.Pay" },
      {
        name: "description",
        content:
          "Plug Nectar.Pay into the platforms you already use — WooCommerce, REST API, webhooks. Non-custodial crypto payments.",
      },
      { property: "og:title", content: "Integrations · Nectar.Pay" },
      {
        property: "og:description",
        content: "WooCommerce plugin, REST API, and webhooks. Drop us in wherever you sell.",
      },
          { property: "og:url", content: "https://nectar-pay.com/integrations" },
],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/integrations" }],
  }),
  component: IntegrationsIndex,
});

function IntegrationsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Integrations.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Drop Nectar.Pay into the platforms you already use. Non-custodial — funds settle
            straight to your wallet.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <IntegrationCard
              icon={<ShoppingBag className="h-5 w-5" />}
              name="WooCommerce"
              tagline="WordPress plugin. Five-minute setup."
              description="Drop our plugin into WordPress, paste your API key, and your customers can pay in BTC, TEXITcoin, or stablecoins."
              to="/integrations/woocommerce"
              cta="View plugin"
              available
            />
            <IntegrationCard
              icon={<Code2 className="h-5 w-5" />}
              name="REST API"
              tagline="Build it into anything."
              description="Create invoices, watch for payments, and verify webhooks from any backend. Full reference in the docs."
              to="/docs"
              cta="Read the docs"
              available
            />
            <IntegrationCard
              icon={<Zap className="h-5 w-5" />}
              name="Shopify"
              tagline="Probably never."
              description="Shopify's payment layer is closed, centralized, and tuned to a public-stock incentive structure. If you're waiting for them to open the rails, you're better off watching their stock price."
            />
            <IntegrationCard
              icon={<Zap className="h-5 w-5" />}
              name="Magento, OpenCart, PrestaShop"
              tagline="On request."
              description="If your platform speaks REST, we can plug in. Talk to us about a custom connector."
            />
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

function IntegrationCard({
  icon,
  name,
  tagline,
  description,
  to,
  cta,
  available,
}: {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  description: string;
  to?: string;
  cta?: string;
  available?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        available ? "border-border bg-card/60" : "border-border/60 bg-card/30 opacity-80"
      }`}
    >
      <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {name}
      </h2>

      <div className="mt-3 text-lg font-medium">{tagline}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {available && to && cta ? (
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link to={to}>
            {cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <div className="mt-5 text-xs text-muted-foreground">Not yet available</div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integrations/woocommerce")({
  head: () => ({
    meta: [
      { title: "WooCommerce integration · Nectar.Pay" },
      {
        name: "description",
        content:
          "Install our WooCommerce plugin to accept BTC, TEXITcoin and stablecoins on your WordPress store. Non-custodial.",
      },
      { property: "og:title", content: "WooCommerce + Nectar.Pay" },
      {
        property: "og:description",
        content: "Non-custodial crypto payments for WooCommerce. Five-minute setup.",
      },
    ],
  }),
  component: WooPage,
});

function WooPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          WooCommerce · Open gateway integrations
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          The Shopify alternative is plugged into the platform you already use.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Drop our plugin into WordPress, paste your API key, and your customers can pay in BTC,
          TEXITcoin, or stablecoins. Funds settle straight to your wallet — we never touch them.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/plugins/txc-pay-woocommerce.zip">
              <Download className="mr-1 h-4 w-4" /> Download plugin
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth" search={{ mode: "signup" }}>Create an account first</Link>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Plugin zip becomes available after phase 7 of the rollout. Reach out if you want early access.
        </p>

        <div className="mt-12 space-y-8">
          <Step
            n={1}
            title="Install the plugin"
            body="In WordPress admin → Plugins → Add new → Upload, choose the zip above, then Activate."
          />
          <Step
            n={2}
            title="Paste your API key"
            body="WooCommerce → Settings → Payments → Nectar.Pay. Paste the API key and webhook secret from your Nectar.Pay dashboard."
          />
          <Step
            n={3}
            title="Enable the methods you want"
            body="Toggle BTC, TXC and stablecoins independently. Set per-chain confirmation thresholds in the Nectar.Pay dashboard."
          />
          <Step
            n={4}
            title="That's it"
            body="On checkout your customer sees a hosted payment page with a QR code. We deliver a signed webhook to mark the order paid."
          />
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Why not Shopify?</h2>
        <p className="mt-2 text-muted-foreground">
          Shopify locks down its payment surface for non-approved crypto gateways. Anywhere with an
          open gateway interface — WooCommerce, BigCommerce, Magento, custom React/Next stores — we
          plug in via REST. Shopify users: get in touch, we have ideas.
        </p>
      </section>
      <MarketingFooter />
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card/40 p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-sm text-primary">
        {n}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

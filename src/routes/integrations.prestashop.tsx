import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integrations/prestashop")({
  head: () => ({
    meta: [
      { title: "PrestaShop 8.2 integration · NectarPay" },
      {
        name: "description",
        content:
          "Install the NectarPay module for PrestaShop 8.0–8.2 to accept BTC, TEXITcoin and stablecoins on your store. Non-custodial — funds settle to your wallet.",
      },
      { property: "og:title", content: "PrestaShop 8.2 + NectarPay" },
      {
        property: "og:description",
        content:
          "Non-custodial crypto payments for PrestaShop 8.x. Ten-minute setup, no monthly fee.",
      },
      { property: "og:url", content: "https://nectar-pay.com/integrations/prestashop" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/integrations/prestashop" }],
  }),
  component: PrestaShopPage,
});

function PrestaShopPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          PrestaShop 8.0 – 8.2 · Open gateway integrations
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Crypto checkout for PrestaShop 8.2 — no middleman touching your money.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Drop our module into PrestaShop, paste your API key, and your customers can pay in BTC,
          TEXITcoin, or stablecoins. Funds settle straight to your wallet — we never touch them.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/plugins/nectarpay-prestashop.zip">
              <Download className="mr-1 h-4 w-4" /> Download module
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create an account first
            </Link>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Module zip becomes available after phase 7 of the rollout — the PHP source is already in
          our repo. Reach out via <Link to="/contact" className="underline">contact</Link> for
          early access.
        </p>

        <div className="mt-12 space-y-8">
          <Step
            n={1}
            title="Install the module"
            body="PrestaShop admin → Modules → Module Manager → Upload a module. Pick the nectarpay.zip you downloaded above, then click Install."
          />
          <Step
            n={2}
            title="Paste your API key"
            body="Click Configure on the NectarPay module. Paste the API key, Store ID and webhook secret from your NectarPay dashboard."
          />
          <Step
            n={3}
            title="Point the webhook back at your shop"
            body="In the NectarPay dashboard → Webhooks, add https://your-shop.com/index.php?fc=module&module=nectarpay&controller=webhook. This is what marks the order paid on-chain confirmation."
          />
          <Step
            n={4}
            title="Enable the methods you want"
            body="Toggle BTC, TXC and stablecoins independently in the NectarPay dashboard. Chains and confirmation thresholds are set there, not in PrestaShop."
          />
          <Step
            n={5}
            title="Test with a real order"
            body="Add a low-priced product to cart, check out, choose 'Pay with crypto', and confirm the shopper returns to the order confirmation page after the on-chain confirmation."
          />
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Matching transactions</h2>
        <p className="mt-2 text-muted-foreground">
          Every checkout writes both IDs so you can jump between systems without guessing:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Your PrestaShop cart / order #</strong> is sent as{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">order_id</code> when the invoice
            is created, echoed back in every webhook as{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">data.order_id</code>, and shown
            as the "Order #" column in your NectarPay dashboard's Invoices view — search by it
            directly.
          </li>
          <li>
            <strong className="text-foreground">NectarPay's invoice ID</strong> (a UUID) is
            returned from the create call, stored on the shopper's PrestaShop order as the
            payment transaction ID, and also written to a{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">ps_nectarpay_invoice</code>{" "}
            table keyed by cart ID for auditing.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Result: from either side — PrestaShop order or NectarPay invoice — you have the other
          ID one click away.
        </p>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Compatibility</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>PrestaShop 1.7.6 → 8.2 (tested on 8.1 and 8.2)</li>
          <li>PHP 7.4+</li>
          <li>Requires non-plain URL rewriting — enabled by default on 8.x</li>
        </ul>


        <h2 className="mt-10 text-xl font-semibold tracking-tight">On other platforms</h2>
        <p className="mt-2 text-muted-foreground">
          If your platform speaks REST, we can plug in. WooCommerce is already live; Magento and
          OpenCart are the same story as PrestaShop — a small PHP module that hits our{" "}
          <Link to="/docs" className="underline">
            invoice API
          </Link>
          . Talk to us and we'll ship one.
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

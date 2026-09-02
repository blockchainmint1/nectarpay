import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ArrowRight } from "lucide-react";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integrations/")({
  head: () => ({
    meta: [
      { title: "E-commerce integrations · NectarPay" },
      {
        name: "description",
        content:
          "Accept BTC, TEXITcoin and stablecoins on WooCommerce, PrestaShop, OpenCart, Magento, WHMCS and Easy Digital Downloads. Non-custodial — funds settle straight to your wallet.",
      },
      { property: "og:title", content: "NectarPay e-commerce integrations" },
      {
        property: "og:description",
        content:
          "Non-custodial crypto checkout plugins for WooCommerce, PrestaShop, OpenCart, Magento, WHMCS and Easy Digital Downloads.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nectar-pay.com/integrations" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/integrations" }],
  }),
  component: IntegrationsPage,
});

type Plugin = {
  name: string;
  tag: string;
  blurb: string;
  zip: string;
  zipLabel: string;
  details?: string;
  setup: string[];
};

const PLUGINS: Plugin[] = [
  {
    name: "WooCommerce",
    tag: "WordPress · WC 6.0+ · HPOS",
    blurb: "The biggest self-hosted store platform on earth. One file, five-minute setup.",
    zip: "/plugins/nectarpay-woocommerce.zip",
    zipLabel: "Download plugin",
    details: "/integrations/woocommerce",
    setup: [
      "WordPress admin → Plugins → Add new → Upload the zip, then Activate.",
      "WooCommerce → Settings → Payments → NectarPay. Paste your API key and webhook secret.",
      "In the NectarPay dashboard → Webhooks, set the URL to https://your-shop/?wc-api=nectarpay.",
    ],
  },
  {
    name: "PrestaShop",
    tag: "PrestaShop 1.7.6 – 8.2",
    blurb: "Huge in Europe and Latin America. Upload the module, paste three values, done.",
    zip: "/plugins/nectarpay-prestashop.zip",
    zipLabel: "Download module",
    details: "/integrations/prestashop",
    setup: [
      "PrestaShop admin → Modules → Module Manager → Upload a module → pick the zip.",
      "Click Configure and paste your API key, Store ID and webhook secret.",
      "Webhook URL: https://your-shop.com/index.php?fc=module&module=nectarpay&controller=webhook",
    ],
  },
  {
    name: "OpenCart",
    tag: "OpenCart 3.0.x",
    blurb: "Lightweight and still everywhere in APAC and Eastern Europe.",
    zip: "/plugins/nectarpay-opencart.ocmod.zip",
    zipLabel: "Download extension",
    setup: [
      "Extensions → Installer → upload the ocmod zip.",
      "Extensions → Extensions → Payments → install NectarPay, then edit and paste your API key and webhook secret.",
      "Webhook URL: https://your-store.com/index.php?route=extension/payment/nectarpay/webhook",
    ],
  },
  {
    name: "Magento 2 / Adobe Commerce",
    tag: "Magento 2.4.x · PHP 7.4/8.x",
    blurb: "Enterprise carts, same non-custodial settlement. Place order → hosted pay page → webhook invoices it.",
    zip: "/plugins/nectarpay-magento2.zip",
    zipLabel: "Download module",
    setup: [
      "Copy app/code/NectarPay into your install, then bin/magento module:enable NectarPay_Payment && setup:upgrade && cache:flush.",
      "Stores → Configuration → Sales → Payment Methods → NectarPay. Paste your API key and webhook secret.",
      "Webhook URL: https://your-store.com/nectarpay/webhook",
    ],
  },
  {
    name: "WHMCS",
    tag: "WHMCS 8.x · hosting & billing",
    blurb: "Hosts, ISPs and service businesses: unpaid invoices get a Pay with crypto button; the callback marks them paid.",
    zip: "/plugins/nectarpay-whmcs.zip",
    zipLabel: "Download gateway",
    setup: [
      "Unzip into your WHMCS root (keeps modules/gateways/ structure).",
      "System Settings → Payment Gateways → activate NectarPay, paste API key and webhook secret.",
      "Webhook URL: https://your-whmcs.com/modules/gateways/callback/nectarpay.php",
    ],
  },
  {
    name: "Easy Digital Downloads",
    tag: "WordPress · digital goods",
    blurb: "Selling downloads, licenses or courses? Same one-file plugin pattern as WooCommerce.",
    zip: "/plugins/nectarpay-edd.zip",
    zipLabel: "Download plugin",
    setup: [
      "WordPress admin → Plugins → Add new → Upload the zip, then Activate.",
      "Downloads → Settings → Payments → enable NectarPay, then paste API key and webhook secret in the NectarPay tab.",
      "Webhook URL: https://your-site/?nectarpay-webhook=1",
    ],
  },
  {
    name: "CS-Cart",
    tag: "CS-Cart 4.x · Multi-Vendor",
    blurb: "Marketplaces and multi-vendor setups — popular in RU/EU. Add-on + payment processor, same REST contract.",
    zip: "/plugins/nectarpay-cscart.zip",
    zipLabel: "Download add-on",
    setup: [
      "Copy app/addons/nectarpay into your CS-Cart root, then Admin → Add-ons → install NectarPay.",
      "Administration → Payment methods → add a method with the NectarPay processor; paste API key and webhook secret.",
      "Webhook URL: https://your-store.com/index.php?dispatch=payment_notification.process&payment=nectarpay",
    ],
  },
  {
    name: "Zen Cart",
    tag: "Zen Cart 1.5.8+ / 2.x",
    blurb: "The old workhorse still runs a lot of long-lived stores. Drop-in payment module, no core edits.",
    zip: "/plugins/nectarpay-zencart.zip",
    zipLabel: "Download module",
    setup: [
      "Copy includes/ and nectarpay_webhook.php into your Zen Cart root.",
      "Admin → Modules → Payment → install NectarPay, paste API key and webhook secret.",
      "Webhook URL: https://your-store.com/nectarpay_webhook.php",
    ],
  },
  {
    name: "Craft Commerce",
    tag: "Craft CMS 4/5 · Commerce 4/5",
    blurb: "Bespoke content-driven stores. A proper Yii2 gateway plugin with an offsite redirect flow.",
    zip: "/plugins/nectarpay-craftcommerce.zip",
    zipLabel: "Download plugin",
    setup: [
      "Install the plugin, then Commerce → Settings → Gateways → new NectarPay gateway (env-var API keys supported).",
      "Pick NectarPay as a payment method in your checkout templates.",
      "Webhook URL: https://your-site.com/actions/nectarpay/webhook",
    ],
  },
];

function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          Open gateway integrations
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
          Crypto checkout, everywhere you already sell.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Every plugin below does the same three things: creates a NectarPay invoice from the cart
          total, redirects your customer to our hosted pay page (QR + amount), and marks the order
          paid when a signed webhook confirms the on-chain payment. Funds settle straight to your
          wallet — we never touch them.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/auth" search={{ mode: "choose" }}>
              Create an account first
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/docs">Read the invoice API</Link>
          </Button>
        </div>

        <div className="mt-12 space-y-6">
          {PLUGINS.map((p) => (
            <div key={p.name} className="rounded-lg border border-border bg-card/40 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{p.name}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.tag}</p>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">{p.blurb}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={p.zip} download>
                      <Download className="mr-1 h-4 w-4" /> {p.zipLabel}
                    </a>
                  </Button>
                  {p.details && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={p.details}>
                        Full guide <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {p.setup.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">No plugin? Use the payment button</h2>
        <p className="mt-2 text-muted-foreground">
          Any site that can render HTML can take crypto. Every store gets a hosted payment page at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/t/your-store</code> — link it from
          a button, an email, an invoice PDF, or a QR code:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs">
{`<a href="https://app.nectar-pay.com/t/your-store"
   style="display:inline-block;padding:12px 24px;border-radius:8px;
          background:#f5b301;color:#0d1b33;font-weight:600;text-decoration:none">
  Pay with crypto
</a>`}
        </pre>
        <p className="mt-2 text-sm text-muted-foreground">
          No API key needed, no webhook to host — the customer pays, you get the on-chain settlement
          and the dashboard/Telegram ping. Fixed-amount invoices, order metadata and webhooks are
          there when you outgrow the button via the <Link to="/docs" className="underline">invoice API</Link>.
        </p>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">Closed platforms</h2>
        <p className="mt-2 text-muted-foreground">
          Shopify, BigCommerce, Wix and Squarespace lock their payment surfaces to approved
          gateways. If your platform speaks REST, we can still plug in — everything above is a
          thin wrapper around our <Link to="/docs" className="underline">invoice API</Link>, and
          you can also skip plugins entirely and share a{" "}
          <strong className="text-foreground">payment link</strong> (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/t/your-store</code>) in order
          emails, invoices, or a custom checkout button. Talk to us via{" "}
          <Link to="/help" className="underline">help</Link> and we'll get you wired up.
        </p>
      </section>
      <MarketingFooter />
    </div>
  );
}

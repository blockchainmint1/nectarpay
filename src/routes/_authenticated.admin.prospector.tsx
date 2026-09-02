import { createFileRoute } from "@tanstack/react-router";
import { DocBody, DocHeader, Stat } from "@/components/knowledge-shell";

export const Route = createFileRoute("/_authenticated/admin/prospector")({
  head: () => ({
    meta: [
      { title: "Merchant Prospector Playbook · Nectar-PAY Admin" },
      {
        name: "description",
        content:
          "How to find, fingerprint, and convert thousands of e-commerce merchants — WooCommerce detection, data sources, outreach sequences, and the volume playbook.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Growth · Internal working doc"
        title="Merchant Prospector Playbook"
        lede="Everything we worked out on finding merchants at scale: how to fingerprint WooCommerce (and every other cart we now support), where the lists live, what's legal, and the outreach sequences that turn a list into transaction volume."
      />
      <DocBody>
        <div className="not-prose mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat value="9" label="Carts we support" />
          <Stat value="~6M" label="Live Woo stores (est.)" />
          <Stat value="0%" label="Our transaction fee" />
          <Stat value="Weeks" label="Time-to-volume target" />
        </div>

        <h2>1. Fingerprinting a WooCommerce store</h2>
        <p>
          You never crawl the open web. You test a candidate domain against a handful of tells that
          WooCommerce cannot hide. Any one of these is a strong signal; two is conclusive.
        </p>
        <ul>
          <li>
            <strong>HTML markers:</strong> <code>wp-content/plugins/woocommerce/</code> asset paths,{" "}
            <code>woocommerce-*</code> body classes, inline <code>wc-ajax=</code> endpoints,{" "}
            <code>woocommerce-no-js</code> on <code>&lt;html&gt;</code>.
          </li>
          <li>
            <strong>Store API probe (best signal):</strong>{" "}
            <code>GET /wp-json/wc/store/v1/products</code> — public with no auth on most installs. A
            200 with a JSON array means a live store with a real catalog, and you get product count,
            currency, and price range for free.
          </li>
          <li>
            <strong>REST root:</strong> <code>GET /wp-json/</code> lists installed namespaces —
            reveals which payment gateways they already run (Stripe, PayPal, Square) and whether any
            crypto plugin is present.
          </li>
          <li>
            <strong>Legacy hook:</strong> <code>/?wc-api=</code> responds instead of 404ing.
          </li>
          <li>
            <strong>Headers/other carts:</strong> Magento sets <code>X-Magento-*</code> cookies;
            PrestaShop exposes <code>/modules/</code> paths and a <code>PrestaShop-*</code> cookie;
            OpenCart uses <code>index.php?route=</code>; Zen Cart / CS-Cart have distinctive
            template paths.
          </li>
        </ul>

        <h2>2. Where the lists come from</h2>
        <ul>
          <li>
            <strong>HTTP Archive (BigQuery, free):</strong> the <code>httparchive.technologies</code>{" "}
            table already tags every crawled site with detected tech. One query returns every
            WooCommerce domain in the crawl — millions of rows, filterable by rank. This is the
            cheapest starting universe, no scraping required.
          </li>
          <li>
            <strong>Common Crawl:</strong> free index of the web; grep the WAT/WET files for Woo
            asset paths if you want fresher or deeper coverage than HTTP Archive.
          </li>
          <li>
            <strong>BuiltWith / StoreLeads / Wappalyzer lists:</strong> paid but cheap, and they add
            firmographics (traffic band, revenue estimate, country, contact email).
          </li>
          <li>
            <strong>Local/geo:</strong> Google Places + Yelp for a market (Dallas / Fort Worth
            first), then fingerprint each business's website. This is how you get boots-on-ground
            merchants, not just faceless dropshippers.
          </li>
          <li>
            <strong>High-intent signals:</strong> WordPress.org support forums and Reddit threads
            asking about crypto payments; abandoned crypto-gateway plugins with open issues; stores
            already running BTCPay or Coinbase Commerce (they've self-selected).
          </li>
        </ul>

        <h2>3. Qualification scoring</h2>
        <p>Score each candidate 0–100 before anyone touches it:</p>
        <ul>
          <li>Live catalog with 10+ products and real prices — the site isn't abandoned.</li>
          <li>Checkout reachable and SSL valid.</li>
          <li>Currency / country in a market we serve.</li>
          <li>Existing gateway detected (they already sell — the hard part is done).</li>
          <li>Bonus: high-risk or fee-sensitive vertical (below).</li>
          <li>Bonus: any crypto mention anywhere on the site.</li>
          <li>Penalty: enterprise platform, marketplace-only, or no contact path.</li>
        </ul>

        <h2>4. Rules of the road (do this properly)</h2>
        <ul>
          <li>Respect <code>robots.txt</code> and rate-limit hard — 1 request/sec per host, max.</li>
          <li>
            Identify the crawler with a real user agent and a URL explaining who we are. WAFs
            (Cloudflare, Sucuri) will block anything that looks anonymous.
          </li>
          <li>
            Hit the REST endpoints, not the full HTML — search pages are uncached on most hosts and
            hammering them is what gets you banned.
          </li>
          <li>
            Cold email must be CAN-SPAM compliant (real identity, physical address, working
            unsubscribe). GDPR applies to EU merchants — legitimate-interest B2B only, and honor
            opt-outs immediately.
          </li>
          <li>Never scrape personal data beyond a public business contact address.</li>
        </ul>

        <h2>5. Where the thousands of merchants actually are</h2>
        <p>Ranked by how fast they convert, not by list size:</p>
        <ol>
          <li>
            <strong>The TXC / IDMC / mineTXC community.</strong> Warmest audience on earth for this.
            Every miner and member who owns or influences a business is a merchant. Run it through
            the affiliate program — they get paid to bring us merchants.
          </li>
          <li>
            <strong>Fee-sensitive and high-risk verticals:</strong> firearms and ammo, CBD/hemp,
            nutraceuticals, vape, adult, precious metals, gun ranges, tattoo shops, kratom, survival
            and prepper gear, ammo reloading, high-ticket collectibles. These merchants pay 5–15%
            or get deplatformed entirely. Our 0% non-custodial, no-chargeback pitch is not a nice-to-have
            for them — it's oxygen.
          </li>
          <li>
            <strong>Chargeback-abused sellers:</strong> digital downloads, ticketing, custom/made-to-order.
            Lead with "irreversible settlement," not with "crypto."
          </li>
          <li>
            <strong>International / remittance-adjacent:</strong> LatAm and Spanish-language stores
            where card acceptance is expensive and stablecoins are already normal. TSD and USDT are
            the hook.
          </li>
          <li>
            <strong>Main Street in pilot markets:</strong> Dallas / Fort Worth first — coffee, food
            trucks, barbers, farmers markets, gun stores, dispensary-adjacent. The terminal plus{" "}
            <code>/t/your-store</code> link closes these in one visit.
          </li>
          <li>
            <strong>Agencies and WordPress freelancers.</strong> One agency installs us on 40 client
            stores. Recruit them into the affiliate program with a rev-share, not a one-time bounty.
          </li>
        </ol>

        <h2>6. Distribution channels that compound</h2>
        <ul>
          <li>
            <strong>Directory listings:</strong> WordPress.org plugin directory (free, huge organic
            intent), WooCommerce Marketplace, Magento Marketplace, PrestaShop Addons, OpenCart
            extensions, WHMCS Marketplace, CS-Cart add-ons, Craft Plugin Store. Every listing is a
            permanent inbound funnel with keyword search built in.
          </li>
          <li>
            <strong>SEO on the integration pages:</strong> "accept crypto WooCommerce", "PrestaShop
            bitcoin payment", "WHMCS crypto gateway" etc. Each cart gets its own page — we already
            built them.
          </li>
          <li>
            <strong>Comparison content:</strong> vs BTCPay Server, vs Coinbase Commerce, vs
            NOWPayments. Non-custodial + no fee + real terminal hardware is a genuinely differentiated
            row in that table.
          </li>
          <li>
            <strong>Communities:</strong> r/woocommerce, r/ecommerce, WP Facebook groups, high-risk
            merchant forums, Telegram crypto-merchant channels. Answer questions, don't spam.
          </li>
          <li>
            <strong>Affiliate flywheel:</strong> every merchant, miner, and member has a tracking
            URL and a printable flyer already. Push the flyer + QR at every event.
          </li>
        </ul>

        <h2>7. Outreach that works</h2>
        <p>
          The winning motion is a <strong>personalized 30-second Loom of their own checkout</strong>{" "}
          with the crypto button added. It proves the install is trivial and that we looked at their
          store.
        </p>
        <ul>
          <li>
            <strong>Email 1 — the number.</strong> "You're paying roughly $X/yr in card fees on your
            catalog. Here's your checkout with a 0% option added." Link the Loom. One CTA: book a
            demo at <code>/demo</code>.
          </li>
          <li>
            <strong>Email 2 (day 3) — the chargeback angle.</strong> Irreversible settlement, no
            reserves, no deplatforming. Best for high-risk verticals.
          </li>
          <li>
            <strong>Email 3 (day 7) — the install.</strong> "Plugin, API key, live in 10 minutes."
            Link the plugin zip for their exact cart.
          </li>
          <li>
            <strong>Email 4 (day 14) — the breakup.</strong> Short, kills the thread, gets the
            highest reply rate of the sequence.
          </li>
          <li>
            Every reply drops into <code>/admin/crm</code>. Track source, market, and rep there.
          </li>
        </ul>

        <h2>8. The tool to build (next session)</h2>
        <p>
          An admin prospector at this route that turns the above into a pipeline:
        </p>
        <ol>
          <li>Paste or upload a domain list (or pull straight from an HTTP Archive export).</li>
          <li>
            Fingerprint each domain server-side: Store API probe, REST root, HTML markers → detect
            cart, gateways, product count, currency, country.
          </li>
          <li>Score with the rules in §3 and store as a prospect row.</li>
          <li>Push qualified prospects into the existing CRM with source attribution.</li>
          <li>One-click "generate personalized Loom script" and pre-filled outreach email per prospect.</li>
        </ol>
        <p>
          Implementation notes: fingerprinting runs in a server function with a strict per-host rate
          limit and a shared cache; Firecrawl handles the pages that need JS rendering. Store
          prospects in their own table so CRM leads stay clean until a prospect actually replies.
        </p>

        <h2>9. Honest sequencing</h2>
        <p>
          The TXC community and the high-risk verticals give you transaction volume in{" "}
          <strong>weeks</strong>. Directory listings and SEO compound over{" "}
          <strong>months</strong> but end up being the bigger number. Run both from day one; only
          judge them on different clocks.
        </p>
      </DocBody>
    </>
  );
}

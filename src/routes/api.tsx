import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "Nectar.Pay API — Directory, payments & webhooks" },
      { name: "description", content: "Public Nectar.Pay APIs: the open merchant directory feed, payments, rates, and signed webhooks." },
      { property: "og:title", content: "Nectar.Pay API" },
      { property: "og:description", content: "The open merchant directory feed plus payment APIs for partners and developers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/api" }],
  }),
  component: ApiPage,
});

const BASE = "https://app.nectar-pay.com";

const SAMPLE = `{
  "generated_at": "2026-10-27T11:00:00Z",
  "since": null,
  "count": 1,
  "stores": [{
    "id": "dedc6db9-c547-45ed-920a-a5c325d49507",   // permanent, never changes
    "slug": "blakes-bbq",
    "listing": "full",            // "full" | "city_only"
    "status": "live",
    "name": "Blake's BBQ",
    "category": "Restaurant",
    "description": "Texas BBQ, family-run since 2014.",
    "logo_url": "${BASE}/api/public/store-logo/…/logo.png",
    "presence": "physical",       // "physical" | "online" | "both"
    "address": { "street": "123 Main St", "city": "Odessa", "region": "TX",
                 "postal_code": "79761", "country": "United States" },
    "location": { "lat": 31.84, "lng": -102.36, "precision": "exact" },
    "phone": "(432) 555-0100",
    "website": "https://example.com",
    "hours": "Mon–Sat 11am–9pm",
    "accepts": ["BTC", "TSD", "TXC", "USDC"],
    "updated_at": "2026-10-27T10:57:57Z"
  }],
  "removed": [
    { "id": "…", "status": "closed", "removed_at": "2026-10-27T09:00:00Z" }
  ]
}`;

function ApiPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto max-w-[90rem] px-4 py-12 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Developers & partners</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Nectar.Pay API</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Nectar.Pay is the official directory of merchants in the Honest Money ecosystem. Anyone can show it. Merchants accept payments through the same API.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card title="Merchant directory" body="Open feed of every business that accepts crypto through Nectar.Pay. No key needed." href="#directory" />
          <Card title="Payments API" body="Create invoices, payment links, check status and receive signed webhooks. Needs a store API key." to="/docs" />
          <Card title="Machine-readable spec" body="OpenAPI description and AI-friendly docs for tools and agents." href="/openapi.json" />
        </div>

        <section id="directory" className="mt-14 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Merchant directory feed</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Free and public. You can see it as a page at <Link to="/directory" className="text-primary underline">/directory</Link>.
          </p>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="min-w-0 space-y-4 text-sm">
              <Endpoint method="GET" path="/api/public/v1/directory" desc="Every listed merchant." />
              <Endpoint method="GET" path="/api/public/v1/directory?since=2026-10-26T00:00:00Z" desc="Only stores added or changed after that time, plus stores that were closed or unlisted." />
              <div className="rounded-lg border border-border bg-card/60 p-4">
                <div className="font-medium">Rules of the road</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>No key, no sign-up. Cross-site requests (CORS) are allowed from any site.</li>
                  <li>Use <code>id</code> as your permanent reference. Names and slugs can change.</li>
                  <li>Merchants choose how they appear. <code>city_only</code> stores carry no name, address or contact, and their location is rounded to about 10 km.</li>
                  <li>Only stores that accept at least one coin are listed.</li>
                  <li>Responses are cached for 5 minutes. For daily syncs, save <code>generated_at</code> and pass it as <code>since</code> next time.</li>
                  <li>Remove anything listed in <code>removed</code> from your copy.</li>
                  <li>Nectar.Pay is the source of truth. Please don’t edit stores in your copy; ask merchants to update their info in Nectar.Pay.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card/60 p-4">
                <div className="font-medium">Try it</div>
                <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">curl {BASE}/api/public/v1/directory</pre>
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 text-sm font-medium">Example response</div>
              <pre className="overflow-x-auto rounded-lg border border-border bg-card/60 p-4 text-xs leading-relaxed">{SAMPLE}</pre>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Payments API</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            For stores and plugins: invoices, payment links, rates, store info and signed webhooks. Full reference in the{" "}
            <Link to="/docs" className="text-primary underline">developer docs</Link>; keys are explained on{" "}
            <Link to="/docs/api-keys" className="text-primary underline">API keys</Link>.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Card({ title, body, href, to }: { title: string; body: string; href?: string; to?: "/docs" }) {
  const cls = "block rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40 hover:bg-accent";
  const inner = (<><div className="font-semibold">{title}</div><p className="mt-1 text-sm text-muted-foreground">{body}</p></>);
  return to ? <Link to={to} className={cls}>{inner}</Link> : <a href={href} className={cls}>{inner}</a>;
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">{method}</span>
        <span className="truncate">{path}</span>
      </div>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </div>
  );
}

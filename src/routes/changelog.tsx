import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "API Changelog · NectarPay" },
      { name: "description", content: "Every change to the NectarPay public API, newest first." },
      { property: "og:title", content: "NectarPay API Changelog" },
      { property: "og:description", content: "Every change to the NectarPay public API, newest first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Changelog,
});

const ENTRIES = [
  { date: "2026-09-29", items: [
    "Published a machine-readable API description at /openapi.json.",
    "Every error response now includes a stable `code` field (unauthorized, not_found, rate_limited, …).",
    "Usage limit: 120 requests per minute per key. Over the limit returns 429 with a Retry-After header.",
    "New pages: API status, this changelog, and a how-to for creating API keys.",
  ]},
  { date: "2026-09", items: [
    "Added `overpaid` status and `invoice.overpaid` webhook.",
    "Underpayments within 1% (max $25) are accepted as paid.",
    "Unpaid invoices expire after 24 hours; payments older than the invoice are ignored.",
    "Added payment links, store profile, rates, invoice email and webhook history endpoints.",
  ]},
];

function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">API changelog</h1>
        <p className="mt-2 text-muted-foreground">
          v1 is stable: we only add fields and endpoints, never remove or rename them without a new version.
          See the <Link to="/docs" className="underline">docs</Link>.
        </p>
        <div className="mt-10 space-y-8">
          {ENTRIES.map((e) => (
            <div key={e.date} className="rounded-lg border border-border bg-card/40 p-6">
              <h2 className="font-mono text-sm text-muted-foreground">{e.date}</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {e.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

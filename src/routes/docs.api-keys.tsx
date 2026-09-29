import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";

export const Route = createFileRoute("/docs/api-keys")({
  head: () => ({
    meta: [
      { title: "How to get your API key · NectarPay" },
      { name: "description", content: "Step-by-step: create a NectarPay API key and webhook secret for your store." },
      { property: "og:title", content: "Get your NectarPay API key" },
      { property: "og:description", content: "Step-by-step: create a NectarPay API key and webhook secret for your store." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiKeysHelp,
});

function ApiKeysHelp() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Get your API key</h1>
        <p className="mt-2 text-muted-foreground">Takes about a minute. You need a NectarPay account with at least one store.</p>
        <ol className="mt-8 list-decimal space-y-4 pl-5">
          <li><Link to="/auth" search={{ mode: "choose" }} className="underline">Sign in</Link> (or create a free account).</li>
          <li>Open <strong>Stores</strong> and pick the store that should receive payments.</li>
          <li>Go to <strong>API keys</strong> and press <strong>Create key</strong>. Give it a name, like "Lovable shop".</li>
          <li>Copy the key — it starts with <code className="rounded bg-muted px-1">sk_live_</code> and is shown <strong>only once</strong>. Keep it secret.</li>
          <li>Optional: on the same store, open <strong>Webhooks</strong>, set your URL and copy the webhook secret so your site is told the moment a payment lands.</li>
        </ol>
        <div className="mt-8 rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          A key can create invoices and read sales for its one store. It can never move money — payments go
          straight to your own wallet. Lost or leaked a key? Revoke it on the same page and create a new one.
        </div>
        <p className="mt-6 text-sm">
          Test it: <code className="rounded bg-muted px-1">curl -H "Authorization: Bearer sk_live_…" https://app.nectar-pay.com/api/public/v1/me</code>
        </p>
      </section>
      <MarketingFooter />
    </div>
  );
}

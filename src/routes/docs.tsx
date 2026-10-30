import { createFileRoute } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Developer Docs & API Reference · Nectar.Pay" },
      {
        name: "description",
        content:
          "Full public API reference for the Nectar.Pay gateway: authentication, invoices, statuses, webhooks, signature verification, and the drop-in JS checkout button.",
      },
      { property: "og:title", content: "Nectar.Pay Developer Docs" },
      {
        property: "og:description",
        content:
          "Everything a third-party integration needs: API keys, invoice creation, status polling, signed webhooks, and error formats.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nectar-pay.com/docs" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/docs" }],
  }),
  component: DocsPage,
});

import { PaymentsApiReference as DocsBody } from "@/components/payments-api-reference";

function DocsPage() {
  const { user, loading } = useAuth();

  // Signed-in merchants keep their dashboard navigation on /docs.
  if (!loading && user) {
    return (
      <DashboardShell>
        <DocsBody />
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <DocsBody />
      <MarketingFooter />
    </div>
  );
}


import { createFileRoute } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { IntegrationsBody } from "./integrations.index";
import { DocsBody } from "./docs";

export const Route = createFileRoute("/integrate")({
  head: () => ({
    meta: [
      { title: "Integrate · Nectar.Pay" },
      {
        name: "description",
        content:
          "One page to plug Nectar.Pay in — WooCommerce, REST API, webhooks, drop-in JS button, and the full developer docs.",
      },
      { property: "og:title", content: "Integrate · Nectar.Pay" },
      {
        property: "og:description",
        content: "Integrations up top, developer docs below. Everything to ship crypto checkout.",
      },
      { property: "og:url", content: "https://nectar-pay.com/integrate" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/integrate" }],
  }),
  component: IntegratePage,
});

function IntegratePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <IntegrationsBody />
      <DocsBody />
      <MarketingFooter />
    </div>
  );
}

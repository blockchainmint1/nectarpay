import { createFileRoute } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { TerminalKitSection, PricingPlansBody } from "./pricing";
import { CompareBody } from "./compare";

export const Route = createFileRoute("/price")({
  head: () => ({
    meta: [
      { title: "Price · Nectar.Pay" },
      {
        name: "description",
        content:
          "The Merchant Start-up Kit, an honest side-by-side with the field, and our three flat-fee membership plans — all on one page.",
      },
      { property: "og:title", content: "Price · Nectar.Pay" },
      {
        property: "og:description",
        content: "Terminal kit at the top, honest comparison in the middle, plans at the bottom.",
      },
      { property: "og:url", content: "https://nectar-pay.com/price" },
    ],
    links: [{ rel: "canonical", href: "https://nectar-pay.com/price" }],
  }),
  component: PricePage,
});

function PricePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <TerminalKitSection />
      <CompareBody />
      <PricingPlansBody />
      <MarketingFooter />
    </div>
  );
}

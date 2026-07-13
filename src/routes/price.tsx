import { createFileRoute } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { TerminalKitSection, PricingPlansBody } from "./pricing";
import { CompareHero, ComparePillars, CompareTable, CompareExtras } from "./compare";

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
        content: "Honest comparison up top, the kit, live stats, feature-by-feature, then plans.",
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
      <CompareHero />
      <TerminalKitSection />
      <ComparePillars />
      <CompareTable />
      <CompareExtras />
      <PricingPlansBody />
      <MarketingFooter />
    </div>
  );
}

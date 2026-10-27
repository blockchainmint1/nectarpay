import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles } from "lucide-react";

import { useStoreRef } from "@/lib/store-ref";

export const Route = createFileRoute("/_authenticated/stores/$storeId/promote")({
  head: () => ({
    meta: [
      { title: "Specials & promotions · Nectar.Pay" },
      { name: "description", content: "Set up specials, promotions and offers for your store." },
      { property: "og:title", content: "Specials & promotions · Nectar.Pay" },
      { property: "og:description", content: "Set up specials, promotions and offers for your store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PromotePage,
});

function PromotePage() {
  const { storeSlug } = useStoreRef();
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId: storeSlug }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>
      <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Sparkles className="h-5 w-5 text-primary" /> Specials, promotions & offers
      </h1>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
        Coming next: day-of-week specials, discounts and incentives for your customers.
      </div>
    </div>
  );
}

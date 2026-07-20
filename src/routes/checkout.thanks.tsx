import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, PackageCheck } from "lucide-react";
import { z } from "zod";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { getKitOrderPublic } from "@/lib/kit-checkout.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/thanks")({
  validateSearch: z.object({ order: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Thank you · Nectar.Pay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  const { order } = useSearch({ from: "/checkout/thanks" });
  const get = useServerFn(getKitOrderPublic);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kit-order", order],
    queryFn: () => get({ data: { order_id: order! } }),
    enabled: !!order,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 4000;
      if (d.invoice_status === "confirmed" && d.status !== "pending_payment") return false;
      return 4000;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <main className="mx-auto max-w-2xl px-4 pt-24 pb-16">
        {!order || isError ? (
          <div className="rounded-2xl border border-border/50 bg-card/50 p-8 text-center">
            <h1 className="text-2xl font-semibold">We couldn&rsquo;t find that order.</h1>
            <p className="mt-2 text-foreground/60">
              If you just paid, check your email — we&rsquo;ll confirm as soon as it lands.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/price">Back to pricing</Link>
            </Button>
          </div>
        ) : isLoading || !data ? (
          <div className="flex items-center justify-center py-24 text-foreground/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading your order…
          </div>
        ) : (
          <div className="space-y-6">
            <StatusHero data={data} />

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-foreground/60">
                Order summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Order ID" value={data.id.slice(0, 8).toUpperCase()} />
                <Row label="Email" value={data.email} />
                <Row
                  label="Ship to"
                  value={`${data.ship_city}, ${data.ship_country}`}
                />
                <Row
                  label="Items"
                  value={
                    data.include_first_year
                      ? "Terminal Kit + First-Year Service"
                      : "Terminal Kit"
                  }
                />
                <Row label="Total" value={`$${Number(data.total_usd).toFixed(2)}`} />
                {data.bm_order_number && (
                  <Row label="Fulfillment #" value={data.bm_order_number} />
                )}
              </dl>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/">Back to home</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/integrate">While you wait — read the docs</Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}

function StatusHero({
  data,
}: {
  data: { status: string; invoice_status: string | null; invoice_id: string | null };
}) {
  const paid = data.invoice_status === "confirmed";
  const shipped = data.status === "shipped";
  const submitted = data.status === "submitted_to_bm";

  if (shipped) {
    return (
      <HeroCard
        icon={<PackageCheck className="h-8 w-8 text-primary" />}
        title="Your kit is on its way."
        body="Tracking info was emailed to you by Blockchain Mint."
      />
    );
  }
  if (submitted || (paid && data.status !== "bm_failed")) {
    return (
      <HeroCard
        icon={<CheckCircle2 className="h-8 w-8 text-primary" />}
        title="Payment confirmed — packing now."
        body="We handed the order to Blockchain Mint. You'll get shipping + tracking by email within one business day."
      />
    );
  }
  if (paid && data.status === "bm_failed") {
    return (
      <HeroCard
        icon={<CheckCircle2 className="h-8 w-8 text-primary" />}
        title="Payment confirmed."
        body="Fulfillment handoff hit a snag — our team was alerted and will get your kit moving shortly."
      />
    );
  }
  return (
    <HeroCard
      icon={<Clock className="h-8 w-8 text-primary animate-pulse" />}
      title="Waiting on the blockchain…"
      body="As soon as your payment confirms, we hand it to Blockchain Mint for shipping. This page updates on its own."
    />
  );
}

function HeroCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-primary/30 bg-background/60 p-3">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-foreground/70">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-foreground/60">{label}</dt>
      <dd className="font-mono text-right">{value}</dd>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Zap, AlertTriangle, Wallet } from "lucide-react";

import {
  getBillingOverview,
  setFreeTierMetric,
  changePlan,
  simulateDeposit,
  type BillingOverview,
} from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

function BillingPage() {
  const fetchOverview = useServerFn(getBillingOverview);
  const setMetric = useServerFn(setFreeTierMetric);
  const changePlanFn = useServerFn(changePlan);
  const simDeposit = useServerFn(simulateDeposit);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchOverview(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["billing"] });

  const metricMutation = useMutation({
    mutationFn: (metric: "days" | "invoices" | "volume") => setMetric({ data: { metric } }),
    onSuccess: () => {
      toast.success("Free-tier metric set");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const planMutation = useMutation({
    mutationFn: (plan_id: string) => changePlanFn({ data: { plan_id } }),
    onSuccess: (r) => {
      if (r.charged_txc > 0) toast.success(`Plan changed. Debited ${r.charged_txc} TXC.`);
      else toast.success("Downgraded to Free.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const depositMutation = useMutation({
    mutationFn: (amount_txc: number) => simDeposit({ data: { amount_txc } }),
    onSuccess: () => {
      toast.success("Simulated deposit credited");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Loading billing…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay monthly in TXC. Top up your balance, choose a plan, manage your free tier.
        </p>
      </header>

      <StatusBanner data={data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <CurrentPlanCard data={data} />
        <BalanceCard data={data} onSimDeposit={(n) => depositMutation.mutate(n)} />
        <UsageCard data={data} onPickMetric={(m) => metricMutation.mutate(m)} />
      </div>

      <PlansGrid data={data} onChoose={(p) => planMutation.mutate(p)} busy={planMutation.isPending} />

      <LedgerCard data={data} />
    </div>
  );
}

function StatusBanner({ data }: { data: BillingOverview }) {
  if (!data.is_active) {
    return (
      <Card className="flex items-start gap-3 border-destructive/40 bg-destructive/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div className="text-sm">
          <div className="font-medium text-destructive">API access blocked</div>
          <div className="text-muted-foreground">
            Your free tier is exhausted or your subscription is past due. Top up TXC and choose a paid
            plan to restore the public API.
          </div>
        </div>
      </Card>
    );
  }
  if (data.subscription.grace_period_ends_at) {
    const ends = new Date(data.subscription.grace_period_ends_at);
    if (ends > new Date()) {
      return (
        <Card className="flex items-start gap-3 border-yellow-500/40 bg-yellow-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-500" />
          <div className="text-sm">
            <div className="font-medium">Grace period active</div>
            <div className="text-muted-foreground">
              API stays live until {ends.toLocaleString()}. Top up TXC to avoid interruption.
            </div>
          </div>
        </Card>
      );
    }
  }
  return null;
}

function CurrentPlanCard({ data }: { data: BillingOverview }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{data.plan.name}</span>
        <Badge variant={data.subscription.status === "active" ? "default" : "secondary"}>
          {data.subscription.status}
        </Badge>
      </div>
      <div className="mt-1 font-mono text-sm text-muted-foreground">
        ${data.plan.monthly_price_usd}/mo
        {data.plan.monthly_price_usd > 0 && (
          <> · {(data.plan.monthly_price_usd / data.txc_usd_rate).toFixed(2)} TXC</>
        )}
      </div>
      {data.subscription.current_period_end && (
        <div className="mt-3 text-xs text-muted-foreground">
          Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}
        </div>
      )}
      <ul className="mt-4 space-y-1 text-sm">
        {data.plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-primary" /> {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BalanceCard({
  data,
  onSimDeposit,
}: {
  data: BillingOverview;
  onSimDeposit: (n: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const usd = (data.balance_txc * data.txc_usd_rate).toFixed(2);
  const copy = () => {
    navigator.clipboard.writeText(data.deposit_address.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" /> TXC Balance
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold">
        {data.balance_txc.toFixed(2)} <span className="text-sm text-muted-foreground">TXC</span>
      </div>
      <div className="font-mono text-xs text-muted-foreground">≈ ${usd} USD</div>

      <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Deposit address</div>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate font-mono text-xs">{data.deposit_address.address}</code>
          <Button size="icon" variant="ghost" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {data.deposit_address.memo && (
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            memo: {data.deposit_address.memo}
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Deposits to this address are credited automatically once confirmed on the TXC network.
      </div>
    </Card>
  );
}

function UsageCard({
  data,
  onPickMetric,
}: {
  data: BillingOverview;
  onPickMetric: (m: "days" | "invoices" | "volume") => void;
}) {
  if (data.plan.id !== "free") {
    return (
      <Card className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          This month's usage
        </div>
        <div className="mt-3 space-y-3">
          <UsageRow
            label="Invoices"
            used={data.usage.invoice_count}
            limit={data.plan.invoice_limit}
          />
          <UsageRow
            label="Volume (USD)"
            used={data.usage.volume_usd}
            limit={data.plan.volume_limit_usd}
            money
          />
        </div>
      </Card>
    );
  }

  if (!data.subscription.free_tier_metric) {
    return (
      <Card className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Pick your free tier
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose one. You can subscribe any time before you hit the limit.
        </p>
        <div className="mt-4 space-y-2">
          {(
            [
              { id: "days" as const, label: "30 days unlimited", sub: "Trial period" },
              { id: "invoices" as const, label: "50 invoices", sub: "Lifetime" },
              { id: "volume" as const, label: "$2,500 settled", sub: "Lifetime volume" },
            ] satisfies Array<{ id: "days" | "invoices" | "volume"; label: string; sub: string }>
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onPickMetric(opt.id)}
              className="w-full rounded-md border border-border/60 p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.sub}</div>
            </button>
          ))}
        </div>
      </Card>
    );
  }

  const p = data.free_tier_progress!;
  const pct = Math.min(100, (p.used / p.limit) * 100);
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Free tier usage</div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-semibold">
            {p.unit === "USD" ? `$${p.used.toFixed(0)}` : p.used}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            / {p.unit === "USD" ? `$${p.limit}` : `${p.limit} ${p.unit}`}
          </span>
        </div>
        <Progress value={pct} className="mt-2" />
      </div>
      {pct >= 80 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-xs text-yellow-600">
          <Zap className="h-3.5 w-3.5" />
          You're at {pct.toFixed(0)}%. Upgrade soon to avoid interruption.
        </div>
      )}
    </Card>
  );
}

function UsageRow({
  label,
  used,
  limit,
  money,
}: {
  label: string;
  used: number;
  limit: number | null;
  money?: boolean;
}) {
  const display = money ? `$${used.toFixed(2)}` : used.toString();
  const limDisplay = limit === null ? "∞" : money ? `$${limit.toLocaleString()}` : limit.toLocaleString();
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {display} <span className="text-muted-foreground">/ {limDisplay}</span>
        </span>
      </div>
      {limit !== null && <Progress value={pct} className="mt-1 h-1.5" />}
    </div>
  );
}

const PLAN_COPY: Record<string, { tagline: string; footnote: string; cta: string; highlight?: boolean }> = {
  free: {
    tagline: "Get started. Limited transactions per month.",
    footnote: "Monthly transaction limit set by us — designed for hobby stores and pilots.",
    cta: "Downgrade to Free",
  },
  cheap: {
    tagline: "For growing stores. Higher limits.",
    footnote: "Billed monthly in TEXITcoin. Pay from any TXC wallet.",
    cta: "Be Cheap",
    highlight: true,
  },
  unlimited: {
    tagline: "No transaction caps. Built for scale.",
    footnote: "Billed monthly in TEXITcoin. Cancel anytime.",
    cta: "Go Unlimited",
  },
};

const PLAN_ORDER = ["free", "cheap", "unlimited"] as const;

function PlansGrid({
  data,
  onChoose,
  busy,
}: {
  data: BillingOverview;
  onChoose: (id: string) => void;
  busy: boolean;
}) {
  const ordered = PLAN_ORDER
    .map((id) => data.plans.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Change plan
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {ordered.map((p) => {
          const copy = PLAN_COPY[p.id] ?? { tagline: "", footnote: "", cta: "Choose" };
          const isCurrent = p.id === data.plan.id;
          const txc = p.monthly_price_usd / data.txc_usd_rate;
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl border p-6 ${
                copy.highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card/60"
              } ${isCurrent ? "ring-1 ring-primary" : ""}`}
            >
              <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {p.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-4xl tracking-tight">${p.monthly_price_usd}</span>
                {p.monthly_price_usd > 0 ? (
                  <span className="text-sm text-muted-foreground">/mo</span>
                ) : null}
              </div>
              {p.monthly_price_usd > 0 && (
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  ≈ {txc.toFixed(2)} TXC/mo
                </div>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{copy.tagline}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex-1" />
              <Button
                className="mt-2 w-full"
                disabled={isCurrent || busy}
                variant={isCurrent ? "outline" : copy.highlight ? "default" : "outline"}
                onClick={() => onChoose(p.id)}
              >
                {isCurrent ? "Current plan" : copy.cta}
              </Button>
              {copy.footnote ? (
                <p className="mt-3 text-xs text-muted-foreground">{copy.footnote}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LedgerCard({ data }: { data: BillingOverview }) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Recent TXC activity
      </h2>
      <Card className="overflow-hidden">
        {data.ledger.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No ledger entries yet. Deposit TXC to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Kind</th>
                <th className="px-4 py-2 text-right font-medium">TXC</th>
                <th className="px-4 py-2 text-right font-medium">USD</th>
                <th className="px-4 py-2 text-left font-medium">Ref</th>
              </tr>
            </thead>
            <tbody>
              {data.ledger.map((l) => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="px-4 py-2 font-mono text-xs">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {l.kind}
                    </Badge>
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono ${
                      l.amount_txc >= 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {l.amount_txc >= 0 ? "+" : ""}
                    {l.amount_txc.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                    {l.usd_value !== null ? `$${Math.abs(l.usd_value).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 truncate font-mono text-xs text-muted-foreground">
                    {l.reference ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </section>
  );
}

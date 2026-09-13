import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight } from "lucide-react";

import { useReportData, money } from "@/components/reports/report-context";
import { DeltaTile, Empty, Panel, Tile, CsvButton } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "Reports summary · Nectar-PAY" },
      { name: "description", content: "Headline payment volume, counts and trend for your stores." },
    ],
  }),
  component: SummaryReport,
});

const LINKS = [
  { to: "/reports/sales", label: "Sales over time", body: "Daily and monthly trend, best days, busiest hours." },
  { to: "/reports/methods", label: "Payment methods", body: "Which coins and chains customers actually use." },
  { to: "/reports/locations", label: "Stores & devices", body: "Volume per store, terminal and share link." },
  { to: "/reports/invoices", label: "Customers & invoices", body: "Payment requests, opens, and repeat payers." },
  { to: "/reports/settlement", label: "Settlement & fees", body: "What landed, and what card fees would have cost." },
  { to: "/reports/tax", label: "Tax & accounting", body: "Monthly totals ready for your bookkeeper." },
] as const;

function SummaryReport() {
  const { data, isLoading, error } = useReportData();

  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load your reports. Try again in a moment.</Empty>;

  const { totals, previous, currency } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DeltaTile
          label="Paid volume"
          value={money(totals.volume, currency)}
          current={totals.volume}
          previous={previous?.volume}
          currency={currency}
        />
        <DeltaTile
          label="Payments"
          value={String(totals.count)}
          current={totals.count}
          previous={previous?.count}
          sub={previous ? `vs ${previous.count} prior` : undefined}
        />
        <DeltaTile
          label="Average payment"
          value={money(totals.average, currency)}
          current={totals.average}
          previous={previous?.average}
          currency={currency}
        />
        <Tile
          label="Unpaid / expired"
          value={money(totals.unpaidValue + totals.expiredValue, currency)}
          sub={`${totals.unpaidCount} open · ${totals.expiredCount} expired`}
        />
      </div>

      <Panel
        title="Revenue over time"
        description={data.range.grain === "month" ? "Monthly paid volume" : "Daily paid volume"}
        action={
          <CsvButton
            filename="nectarpay-revenue.csv"
            headers={["bucket", "volume", "payments"]}
            rows={data.series.map((p) => [p.bucket, p.volume, p.count])}
          />
        }
      >
        {data.series.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => money(Number(v), currency)}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            search={(prev: Record<string, unknown>) => prev as never}
            className="rounded-lg border border-border bg-card/50 p-5 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{l.label}</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{l.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

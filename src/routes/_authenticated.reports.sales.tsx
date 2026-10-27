import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReportData, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile, Bar as MiniBar } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/sales")({
  head: () => ({
    meta: [
      { title: "Sales over time · Nectar-PAY reports" },
      { name: "description", content: "Daily and monthly sales trend, best days and busiest hours." },
    ],
  }),
  component: SalesReport,
});

function hourLabel(h: number) {
  const ampm = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${ampm}`;
}

function SalesReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { currency } = data;
  const maxWeekday = Math.max(0, ...data.byWeekday.map((w) => w.volume));
  let running = 0;
  const withRunning = data.series.map((p) => {
    running += p.volume;
    return { ...p, running: Math.round(running * 100) / 100 };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          label="Best day"
          value={data.best.day ? money(data.best.day.volume, currency) : "—"}
          sub={data.best.day ? `${data.best.day.bucket} · ${data.best.day.count} payments` : undefined}
        />
        <Tile
          label="Busiest hour"
          value={data.best.hour !== null ? hourLabel(data.best.hour) : "—"}
          sub="Most payments taken"
        />
        <Tile
          label="Running total"
          value={money(data.totals.volume, currency)}
          sub={`${data.totals.count} payments over ${data.range.days} days`}
        />
      </div>

      <Panel
        title={data.range.grain === "month" ? "Monthly sales" : "Daily sales"}
        description="Paid volume with a running total"
        action={
          <CsvButton
            filename="nectarpay-sales-over-time.csv"
            headers={["bucket", "volume", "payments", "running_total"]}
            rows={withRunning.map((p) => [p.bucket, p.volume, p.count, p.running])}
          />
        }
      >
        {withRunning.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={withRunning}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name) =>
                    name === "count" ? [v, "payments"] : money(Number(v), currency)
                  }
                />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="By day of week" description="Where your week earns its keep">
          {maxWeekday === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {data.byWeekday.map((w) => (
                <div key={w.label}>
                  <div className="flex justify-between text-xs">
                    <span>{w.label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {money(w.volume, currency)} · {w.count}
                    </span>
                  </div>
                  <div className="mt-1">
                    <MiniBar value={w.volume} max={maxWeekday} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="By hour of day" description="Payment count per hour">
          {data.totals.count === 0 ? (
            <Empty />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour.map((h) => ({ ...h, label: hourLabel(h.hour) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

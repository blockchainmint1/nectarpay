import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { Bar, CsvButton, Empty, Panel, Tile } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/methods")({
  head: () => ({
    meta: [
      { title: "Payment methods · Nectar-PAY reports" },
      { name: "description", content: "Which coins and chains your customers pay with, and the stablecoin split." },
    ],
  }),
  component: MethodsReport,
});

function MethodsReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { currency, byChain, byToken, stableSplit } = data;
  const total = stableSplit.stable + stableSplit.volatile;
  const stablePct = total > 0 ? Math.round((stableSplit.stable / total) * 100) : 0;
  const maxChain = Math.max(0, ...byChain.map((c) => c.volume));
  const maxToken = Math.max(0, ...byToken.map((t) => t.volume));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Stablecoin share" value={`${stablePct}%`} sub={money(stableSplit.stable, currency)} />
        <Tile label="Volatile coins" value={`${100 - stablePct}%`} sub={money(stableSplit.volatile, currency)} />
        <Tile label="Coins accepted" value={String(byToken.length)} sub={`across ${byChain.length} chains`} />
      </div>

      <Panel
        title="By chain"
        description="Share of paid volume per network"
        action={
          <CsvButton
            filename="nectarpay-by-chain.csv"
            headers={["chain", "volume", "payments", "average"]}
            rows={byChain.map((c) => [c.label, c.volume, c.count, c.average])}
          />
        }
      >
        {byChain.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {byChain.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {money(c.volume, currency)} · {c.count} · avg {money(c.average, currency)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={c.volume} max={maxChain} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="By coin"
        description="Stablecoins are marked — they settle at face value"
        action={
          <CsvButton
            filename="nectarpay-by-coin.csv"
            headers={["coin", "stablecoin", "volume", "payments", "average"]}
            rows={byToken.map((t) => [t.token, t.stable ? "yes" : "no", t.volume, t.count, t.average])}
          />
        }
      >
        {byToken.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {byToken.map((t) => (
              <div key={t.token}>
                <div className="flex justify-between text-sm">
                  <span>
                    {t.token}
                    {t.stable && (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        stable
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {money(t.volume, currency)} · {t.count} · avg {money(t.average, currency)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={t.volume} max={maxToken} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

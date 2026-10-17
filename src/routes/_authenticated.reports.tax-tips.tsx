import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/tax-tips")({
  head: () => ({
    meta: [
      { title: "Tax & tips · Nectar-PAY reports" },
      { name: "description", content: "Per-sale breakdown of tax and tips collected at the terminal." },
    ],
  }),
  component: TaxTipsReport,
});

function TaxTipsReport() {
  const { data, isLoading, error } = useReportData();

  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { taxTips, currency } = data;
  const taxTotal = taxTips.reduce((a, r) => a + (r.tax ?? 0), 0);
  const tipTotal = taxTips.reduce((a, r) => a + (r.tip ?? 0), 0);
  const withTips = taxTips.filter((r) => (r.tip ?? 0) > 0);
  const avgTipPct =
    withTips.length > 0
      ? withTips.reduce((a, r) => a + (r.tipPct ?? 0), 0) / withTips.length
      : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Tax collected" value={money(taxTotal, currency)} sub="rung up at the terminal" />
        <Tile
          label="Tips collected"
          value={money(tipTotal, currency)}
          sub={`${withTips.length} sale${withTips.length === 1 ? "" : "s"} with a tip`}
        />
        <Tile
          label="Average tip"
          value={avgTipPct !== null ? `${avgTipPct.toFixed(1)}%` : "—"}
          sub="of the pre-tip amount"
        />
      </div>

      <Panel
        title="Sale by sale"
        description="Tax and tip on each terminal sale in this range"
        action={
          <CsvButton
            filename="nectarpay-tax-tips.csv"
            headers={["date", "store", "currency", "subtotal", "tax", "tax_pct", "tip", "tip_pct", "total"]}
            rows={taxTips.map((r) => [
              r.date,
              r.store,
              r.currency,
              r.subtotal ?? "",
              r.tax ?? "",
              r.taxPct ?? "",
              r.tip ?? "",
              r.tipPct ?? "",
              r.total,
            ])}
          />
        }
      >
        {taxTips.length === 0 ? (
          <Empty>
            No terminal sales with tax or tip detail in this range yet. Tax and tip amounts are
            recorded when a sale is rung up on the POS terminal.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4 text-right">Subtotal</th>
                  <th className="py-2 pr-4 text-right">Tax</th>
                  <th className="py-2 pr-4 text-right">Tax %</th>
                  <th className="py-2 pr-4 text-right">Tip</th>
                  <th className="py-2 pr-4 text-right">Tip %</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {taxTips.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {new Date(r.date).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.store}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {r.subtotal !== null ? money(r.subtotal, r.currency) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {r.tax !== null ? money(r.tax, r.currency) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-muted-foreground">
                      {r.taxPct !== null ? `${r.taxPct}%` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {r.tip !== null ? money(r.tip, r.currency) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-muted-foreground">
                      {r.tipPct !== null ? `${r.tipPct}%` : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {money(r.total, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="A note on these numbers" description="So nobody is surprised">
        <p className="text-sm text-muted-foreground">
          Tax and tip amounts come from what the cashier rang up on the terminal, shown as a
          percentage of the pre-tax, pre-tip subtotal. Sales made through payment links or
          emailed invoices don't carry this breakdown, so they won't appear here.
        </p>
      </Panel>
    </div>
  );
}

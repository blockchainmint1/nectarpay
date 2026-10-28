import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/egiving")({
  head: () => ({
    meta: [
      { title: "eGiving · Nectar-PAY reports" },
      { name: "description", content: "Monthly eGiving sales and community discounts for bookkeeping and tax records." },
    ],
  }),
  component: EgivingReport,
});

const th = "py-2 pr-4";
const num = "py-2.5 pr-4 text-right font-mono tabular-nums";

function EgivingReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { monthly, sales } = data.egiving;
  const currency = data.currency;
  const salesTotal = sales.reduce((a, r) => a + r.total, 0);
  const discountTotal = sales.reduce((a, r) => a + r.discount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="eGiving sales" value={money(salesTotal, currency)} sub={`${sales.length} sale${sales.length === 1 ? "" : "s"}`} />
        <Tile label="Community discounts" value={money(discountTotal, currency)} sub="given to churches & the program" />
        <Tile label="You received" value={money(salesTotal - discountTotal, currency)} sub="in TSD" />
      </div>

      <Panel
        title="Monthly totals"
        description="Per store, for your bookkeeping and tax records"
        action={
          <CsvButton
            filename="nectarpay-egiving-monthly.csv"
            headers={["month", "store", "currency", "sales_count", "sales", "community_discount", "received"]}
            rows={monthly.map((m) => [m.month, m.store, m.currency, m.count, m.sales, m.discount, m.received])}
          />
        }
      >
        {monthly.length === 0 ? (
          <Empty>No eGiving sales in this range. Turn on eGiving in your store's payment settings to accept them.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className={th}>Month</th><th className={th}>Store</th>
                  <th className={`${th} text-right`}>Sales</th><th className={`${th} text-right`}>Amount</th>
                  <th className={`${th} text-right`}>Discount</th><th className="py-2 text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={`${m.month}-${m.storeId}-${m.currency}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{m.month}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{m.store}</td>
                    <td className={num}>{m.count}</td>
                    <td className={num}>{money(m.sales, m.currency)}</td>
                    <td className={num}>−{money(m.discount, m.currency)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{money(m.received, m.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Sale by sale"
        description="Every eGiving sale in this range"
        action={
          <CsvButton
            filename="nectarpay-egiving-sales.csv"
            headers={["date", "store", "currency", "sale", "discount_pct", "community_discount", "received", "invoice"]}
            rows={sales.map((r) => [r.date, r.store, r.currency, r.total, r.discountPct, r.discount, r.received, r.id])}
          />
        }
      >
        {sales.length === 0 ? (
          <Empty>No eGiving sales yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className={th}>Date</th><th className={th}>Store</th>
                  <th className={`${th} text-right`}>Sale</th><th className={`${th} text-right`}>Discount</th>
                  <th className="py-2 text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap">{new Date(r.date).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.store}</td>
                    <td className={num}>{money(r.total, r.currency)}</td>
                    <td className={num}>−{money(r.discount, r.currency)} ({r.discountPct}%)</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{money(r.received, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="A note on these numbers" description="So nobody is surprised">
        <p className="text-sm text-muted-foreground">
          Every sale here was marked paid in full. The community discount is the share the customer's
          payment sent to their church and the eGiving program instead of to you. Check with your
          accountant on how to record it.
        </p>
      </Panel>
    </div>
  );
}

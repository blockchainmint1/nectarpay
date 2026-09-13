import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/invoices")({
  head: () => ({
    meta: [
      { title: "Customers & invoices · Nectar-PAY reports" },
      { name: "description", content: "Payment request delivery, opens, time to pay, and repeat customers." },
    ],
  }),
  component: InvoicesReport,
});

function duration(mins: number | null) {
  if (mins === null) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)} hrs`;
  return `${(mins / 1440).toFixed(1)} days`;
}

function InvoicesReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { invoicing, repeatPayers, currency, totals } = data;
  const openRate = invoicing.emailed ? Math.round((invoicing.opened / invoicing.emailed) * 100) : 0;
  const payRate = invoicing.emailed ? Math.round((invoicing.paidAfterEmail / invoicing.emailed) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Payment requests sent" value={String(invoicing.emailed)} sub="by email" />
        <Tile label="Opened" value={`${openRate}%`} sub={`${invoicing.opened} of ${invoicing.emailed}`} />
        <Tile label="Paid" value={`${payRate}%`} sub={`${invoicing.paidAfterEmail} of ${invoicing.emailed}`} />
        <Tile label="Average time to pay" value={duration(invoicing.avgMinutesToPay)} sub="from request to confirmed" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Expired" value={String(invoicing.expired)} sub="nobody paid in time" />
        <Tile label="Still open" value={String(totals.unpaidCount)} sub={money(totals.unpaidValue, currency)} />
        <Tile label="Repeat customers" value={String(repeatPayers.length)} sub="paid more than once" />
      </div>

      <Panel
        title="Repeat customers"
        description="Where we have an email on the payment"
        action={
          <CsvButton
            filename="nectarpay-repeat-customers.csv"
            headers={["email", "payments", "volume", "last_payment"]}
            rows={repeatPayers.map((p) => [p.email, p.count, p.volume, p.last])}
          />
        }
      >
        {repeatPayers.length === 0 ? (
          <Empty>No repeat customers in this range yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4 text-right">Payments</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2">Last payment</th>
                </tr>
              </thead>
              <tbody>
                {repeatPayers.map((p) => (
                  <tr key={p.email} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{p.email}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{p.count}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{money(p.volume, currency)}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(p.last).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

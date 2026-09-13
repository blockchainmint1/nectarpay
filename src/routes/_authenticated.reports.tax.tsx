import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { runExport } from "@/lib/exports.functions";
import { Button } from "@/components/ui/button";
import { useReportData, useReportSearch, resolveRange, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile, downloadCsv } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/tax")({
  head: () => ({
    meta: [
      { title: "Tax & accounting · Nectar-PAY reports" },
      { name: "description", content: "Monthly totals, estimated tax collected, and a QuickBooks-ready export." },
    ],
  }),
  component: TaxReport,
});

function TaxReport() {
  const { data, isLoading, error } = useReportData();
  const search = useReportSearch();
  const exportFn = useServerFn(runExport);

  const qbo = useMutation({
    mutationFn: async () => {
      const range = resolveRange(search);
      return exportFn({
        data: {
          format: "quickbooks_csv" as const,
          storeId: search.store ?? null,
          chain: search.chain ?? null,
          status: null,
          fromDate: range.from,
          toDate: range.to,
        },
      });
    },
    onSuccess: (res: { filename: string; mime: string; content: string }) => {
      const url = URL.createObjectURL(new Blob([res.content], { type: res.mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Couldn't build the QuickBooks file. Try again."),
  });

  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { tax, currency, totals } = data;
  const grossTotal = tax.reduce((a, r) => a + r.gross, 0);
  const taxTotal = tax.reduce((a, r) => a + r.taxEstimate, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Gross sales" value={money(grossTotal, currency)} sub={`${totals.count} payments`} />
        <Tile label="Estimated tax collected" value={money(taxTotal, currency)} sub="from your store tax rate" />
        <Tile label="Net of tax" value={money(grossTotal - taxTotal, currency)} />
      </div>

      <Panel
        title="Month by month"
        description="Hand this straight to your bookkeeper"
        action={
          <div className="flex gap-2">
            <CsvButton
              filename="nectarpay-tax-summary.csv"
              headers={["month", "currency", "gross", "estimated_tax", "net", "payments"]}
              rows={tax.map((r) => [r.month, r.currency, r.gross, r.taxEstimate, r.net, r.count])}
            />
            <Button variant="outline" size="sm" onClick={() => qbo.mutate()} disabled={qbo.isPending}>
              {qbo.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              QuickBooks CSV
            </Button>
          </div>
        }
      >
        {tax.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2 pr-4 text-right">Gross</th>
                  <th className="py-2 pr-4 text-right">Est. tax</th>
                  <th className="py-2 pr-4 text-right">Net</th>
                  <th className="py-2 text-right">Payments</th>
                </tr>
              </thead>
              <tbody>
                {tax.map((r) => (
                  <tr key={`${r.month}-${r.currency}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{r.month}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.currency}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{money(r.gross, r.currency)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{money(r.taxEstimate, r.currency)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{money(r.net, r.currency)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="A note on the tax figure" description="So nobody is surprised">
        <p className="text-sm text-muted-foreground">
          The tax column is an estimate based on the tax rate saved in your store's point-of-sale
          settings, backed out of the total charged. If a sale was rung up without tax, or your rate
          changed part-way through a month, the real number will differ. Always reconcile against
          your own records before filing.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() =>
            downloadCsv(
              "nectarpay-annual-summary.csv",
              ["month", "currency", "gross", "estimated_tax", "net", "payments"],
              tax.map((r) => [r.month, r.currency, r.gross, r.taxEstimate, r.net, r.count]),
            )
          }
        >
          Download annual summary
        </Button>
      </Panel>
    </div>
  );
}

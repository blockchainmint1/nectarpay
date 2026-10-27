import { createFileRoute } from "@tanstack/react-router";

import { useReportData, money } from "@/components/reports/report-context";
import { CsvButton, Empty, Panel, Tile } from "@/components/reports/report-ui";

export const Route = createFileRoute("/_authenticated/reports/settlement")({
  head: () => ({
    meta: [
      { title: "Settlement & fees · Nectar-PAY reports" },
      { name: "description", content: "What landed in your wallets, and what card processing would have cost." },
    ],
  }),
  component: SettlementReport,
});

function coin(n: number) {
  const fixed = n.toFixed(8).replace(/\.?0+$/, "");
  const [int, dec] = fixed.split(".");
  return dec ? `${Number(int).toLocaleString()}.${dec}` : Number(int).toLocaleString();
}

function SettlementReport() {
  const { data, isLoading, error } = useReportData();
  if (isLoading) return <Empty>Crunching your numbers…</Empty>;
  if (error || !data) return <Empty>We couldn't load this report.</Empty>;

  const { settlement, savings, totals, currency } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Settled to your wallets" value={money(totals.volume, currency)} sub={`${totals.count} payments`} />
        <Tile
          label="Card processing would have cost"
          value={money(savings.cardFeeUsd, currency)}
          sub="at 2.9% + $0.30 per sale"
        />
        <Tile label="You kept" value={money(savings.cardFeeUsd, currency)} sub="no processor cut on crypto" />
      </div>

      <Panel
        title="What landed, coin by coin"
        description="On-chain amounts received, with their value at the time of sale"
        action={
          <CsvButton
            filename="nectarpay-settlement.csv"
            headers={["chain", "coin", "coin_amount", "value", "payments"]}
            rows={settlement.map((s) => [s.chain, s.token, s.cryptoAmount, s.usd, s.count])}
          />
        }
      >
        {settlement.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4">Chain</th>
                  <th className="py-2 pr-4">Coin</th>
                  <th className="py-2 pr-4 text-right">Amount received</th>
                  <th className="py-2 pr-4 text-right">Value</th>
                  <th className="py-2 text-right">Payments</th>
                </tr>
              </thead>
              <tbody>
                {settlement.map((s) => (
                  <tr key={`${s.chain}-${s.token}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">{s.chain}</td>
                    <td className="py-2.5 pr-4 font-medium">{s.token}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{coin(s.cryptoAmount)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{money(s.usd, currency)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="How the savings are figured" description="Plain math, no magic">
        <p className="text-sm text-muted-foreground">
          We compare your paid volume against a typical card rate of 2.9% plus 30 cents a sale.
          On {money(totals.volume, currency)} across {totals.count} payments, that would have been{" "}
          <span className="text-foreground">{money(savings.cardFeeUsd, currency)}</span> in processing fees.
          Crypto payments land straight in your own wallet, so there is no processor cut — only the
          network fee the customer pays.
        </p>
      </Panel>
    </div>
  );
}

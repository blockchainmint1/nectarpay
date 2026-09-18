import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Copy } from "lucide-react";
import { toast } from "sonner";

import { getStoreInvoiceDetail } from "@/lib/store-invoices.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sales/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Sale detail · Nectar.Pay" },
      {
        name: "description",
        content:
          "Review a single NectarPay sale: amount received, payment method, customer, order reference and on-chain transactions.",
      },
      { property: "og:title", content: "Sale detail · Nectar.Pay" },
      {
        property: "og:description",
        content: "Amount received, payment method, customer and on-chain transactions for one sale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SaleDetailPage,
});

function SaleDetailPage() {
  const { invoiceId } = Route.useParams();
  const detail = useServerFn(getStoreInvoiceDetail);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sale-detail", invoiceId],
    queryFn: () => detail({ data: { invoice_id: invoiceId } }),
  });

  const inv = data?.invoice as any;
  const store = inv?.stores as { id: string; name: string | null } | undefined;
  const currency = (inv?.fiat_currency ?? "USD") as string;
  const paymentMethod = inv
    ? inv.token_symbol
      ? `${String(inv.token_symbol).toUpperCase()} on ${String(inv.chain ?? "").toUpperCase()}`
      : String(inv.chain ?? "—").toUpperCase()
    : "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {store?.id ? (
        <Link
          to="/stores/$storeId/invoices"
          params={{ storeId: store.id }}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Invoices
        </Link>
      ) : (
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
      )}

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>}

      {inv && (
        <>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {store?.name ?? "Sale"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {money(Number(inv.fiat_amount), currency)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(inv.created_at).toLocaleString()} · <span className="capitalize">{inv.status}</span>
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-lg border border-border p-4 text-sm">
            <Row label="Invoice" value={inv.id} mono />
            <Row label="Payment method" value={paymentMethod} />
            {inv.crypto_amount != null && (
              <Row label="Crypto amount" value={String(inv.crypto_amount)} mono />
            )}
            <Row label="Customer" value={inv.buyer_email ?? inv.customer_email ?? "—"} />
            <Row label="Description" value={inv.description ?? "—"} />
            <Row label="Order reference" value={inv.external_order_id ?? "—"} />
            <Row label="Receive address" value={inv.address ?? "—"} mono />
            <Row label="Expires" value={new Date(inv.expires_at).toLocaleString()} />
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              On-chain transactions
            </h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">First seen</th>
                    <th className="px-4 py-2">Transaction</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Confirmations</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.transactions ?? []).map((t: any) => (
                    <tr key={t.id} className="border-t border-border/40">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.first_seen_at).toLocaleString()}
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs">{t.tx_hash}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.amount} {t.token_symbol ?? ""}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.confirmations}</td>
                    </tr>
                  ))}
                  {(data?.transactions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/i/${inv.id}`);
                toast.success("Payment link copied.");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy payment link
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "break-all font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  );
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

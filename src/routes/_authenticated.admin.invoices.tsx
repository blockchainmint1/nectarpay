import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAdminInvoices } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: AdminInvoices,
});

function AdminInvoices() {
  const fn = useServerFn(listAdminInvoices);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Invoices</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Merchant</th>
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Chain</th>
              <th className="px-4 py-2 text-right">USD</th>
              <th className="px-4 py-2 font-mono">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((inv) => (
              <tr key={inv.id} className="border-t border-border/40">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {inv.merchant_name ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2">
                  {(inv as any).store_name ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2 uppercase">{inv.chain}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {inv.fiat_amount ? `$${Number(inv.fiat_amount).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {inv.id.slice(0, 8)}…
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

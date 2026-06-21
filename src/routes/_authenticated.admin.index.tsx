import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-5">
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function AdminOverview() {
  const fn = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fn(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.user_count} />
        <Stat label="Wallets bound" value={data.wallet_count} />
        <Stat label="Stores" value={data.store_count} />
        <Stat label="Invoices" value={data.invoice_count} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Recent invoices
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">USD</th>
                <th className="px-4 py-2 font-mono">ID</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_invoices.map((inv: any) => (
                <tr key={inv.id} className="border-t border-border/40">
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(inv.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{inv.status}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {inv.amount_usd ? `$${Number(inv.amount_usd).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {inv.id.slice(0, 8)}…
                  </td>
                </tr>
              ))}
              {data.recent_invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

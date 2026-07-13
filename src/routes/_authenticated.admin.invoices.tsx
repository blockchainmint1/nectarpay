import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

  const [merchantQ, setMerchantQ] = useState("");
  const [storeQ, setStoreQ] = useState("");
  const [orderQ, setOrderQ] = useState("");
  const [status, setStatus] = useState("");

  const statuses = useMemo(
    () => Array.from(new Set((data ?? []).map((i: any) => i.status).filter(Boolean))).sort(),
    [data],
  );

  const rows = useMemo(() => {
    const m = merchantQ.trim().toLowerCase();
    const s = storeQ.trim().toLowerCase();
    const o = orderQ.trim().toLowerCase();
    return (data ?? []).filter((inv: any) => {
      if (status && inv.status !== status) return false;
      if (m && !(inv.merchant_name ?? "").toLowerCase().includes(m)) return false;
      if (s && !(inv.store_name ?? "").toLowerCase().includes(s)) return false;
      if (o && !(inv.external_order_id ?? "").toLowerCase().includes(o)) return false;
      return true;
    });
  }, [data, merchantQ, storeQ, orderQ, status]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  const inputCls =
    "h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase tracking-tight">Invoices</h1>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={inputCls}
          placeholder="Filter merchant…"
          value={merchantQ}
          onChange={(e) => setMerchantQ(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Filter store…"
          value={storeQ}
          onChange={(e) => setStoreQ(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Filter order #…"
          value={orderQ}
          onChange={(e) => setOrderQ(e.target.value)}
        />
        <select
          className={inputCls}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s as string} value={s as string}>
              {s as string}
            </option>
          ))}
        </select>
        {(merchantQ || storeQ || orderQ || status) && (
          <button
            type="button"
            className="h-9 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMerchantQ("");
              setStoreQ("");
              setOrderQ("");
              setStatus("");
            }}
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} of {(data ?? []).length}
        </span>
      </div>

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
            {rows.map((inv: any) => (
              <tr key={inv.id} className="border-t border-border/40">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {inv.merchant_name ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2">
                  {inv.store_name ?? <span className="text-muted-foreground">—</span>}
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No invoices match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

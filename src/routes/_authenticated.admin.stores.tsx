import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { listAdminStores, updateAdminStore } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/stores")({
  component: AdminStores,
});

type Row = Awaited<ReturnType<typeof listAdminStores>>[number];

function AdminStores() {
  const fn = useServerFn(listAdminStores);
  const updateFn = useServerFn(updateAdminStore);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ market: string; rep: string; notes: string }>({ market: "", rep: "", notes: "" });
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({ queryKey: ["admin-stores"], queryFn: () => fn() });

  const mut = useMutation({
    mutationFn: (vars: { store_id: string; market: string; rep: string; notes: string }) =>
      updateFn({ data: vars }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-stores"] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  const rows = (data ?? []).filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [r.name, r.owner_email, r.market, r.rep, r.plan_id].some((v) =>
      (v ?? "").toString().toLowerCase().includes(s),
    );
  });

  const totalSales = rows.reduce((a, r) => a + (r.total_sales || 0), 0);
  const totalTx = rows.reduce((a, r) => a + r.tx_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Merchants</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length} stores · {totalTx.toLocaleString()} transactions · $
            {totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} processed
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, market, rep, plan…"
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Rep</th>
              <th className="px-3 py-2 text-right">Tx</th>
              <th className="px-3 py-2 text-right">Sales</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r: Row) => {
              const isEditing = editing === r.id;
              return (
                <tr key={r.id} className="border-t border-border/40 align-top">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.owner_email ?? r.owner_name ?? r.owner_id.slice(0, 8) + "…"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs uppercase tracking-wider text-primary">
                        {r.plan_id}
                      </span>
                      {r.sub_status && r.sub_status !== "active" && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.sub_status}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {isEditing ? (
                      <Input
                        value={draft.market}
                        onChange={(e) => setDraft({ ...draft, market: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="DFW, LA…"
                      />
                    ) : (
                      r.market || <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {isEditing ? (
                      <Input
                        value={draft.rep}
                        onChange={(e) => setDraft({ ...draft, rep: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Rep name"
                      />
                    ) : (
                      r.rep || <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.tx_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: r.fiat_currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(r.total_sales)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => mut.mutate({ store_id: r.id, ...draft })}
                          disabled={mut.isPending}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(r.id);
                          setDraft({
                            market: r.market ?? "",
                            rep: r.rep ?? "",
                            notes: r.notes ?? "",
                          });
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                  No merchants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

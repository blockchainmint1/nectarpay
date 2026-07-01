import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X, ChevronRight, ChevronDown } from "lucide-react";
import { listAdminMerchants, updateAdminStore } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/stores")({
  component: AdminMerchants,
});

type Merchant = Awaited<ReturnType<typeof listAdminMerchants>>[number];
type StoreRow = Merchant["stores"][number];

function fmtMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function AdminMerchants() {
  const fn = useServerFn(listAdminMerchants);
  const updateFn = useServerFn(updateAdminStore);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ market: string; rep: string }>({ market: "", rep: "" });
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({ queryKey: ["admin-merchants"], queryFn: () => fn() });

  const mut = useMutation({
    mutationFn: (vars: { store_id: string; market: string; rep: string }) =>
      updateFn({ data: vars }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-merchants"] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  const merchants = (data ?? []).filter((m) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    if (
      [m.email, m.display_name, m.plan_id, ...m.markets].some((v) =>
        (v ?? "").toString().toLowerCase().includes(s),
      )
    )
      return true;
    return m.stores.some((st) => (st.name ?? "").toLowerCase().includes(s));
  });

  const totalStores = merchants.reduce((a, m) => a + m.store_count, 0);
  const totalSales = merchants.reduce((a, m) => a + (m.total_sales || 0), 0);
  const totalTx = merchants.reduce((a, m) => a + m.tx_count, 0);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Merchants</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {merchants.length} merchants · {totalStores} stores · {totalTx.toLocaleString()} transactions · $
            {totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} processed
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, store, market, plan…"
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-8" />
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Markets</th>
              <th className="px-3 py-2 text-right">Stores</th>
              <th className="px-3 py-2 text-right">Tx</th>
              <th className="px-3 py-2 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((m: Merchant) => {
              const open = expanded.has(m.owner_id);
              return (
                <>
                  <tr
                    key={m.owner_id}
                    className="border-t border-border/40 cursor-pointer hover:bg-muted/30"
                    onClick={() => toggle(m.owner_id)}
                  >
                    <td className="px-3 py-2">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.email ?? m.display_name ?? m.owner_id.slice(0, 8) + "…"}</div>
                      {m.email && m.display_name && (
                        <div className="text-xs text-muted-foreground">{m.display_name}</div>
                      )}
                      {m.roles.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {m.roles.map((r) => (
                            <span
                              key={r}
                              className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs uppercase tracking-wider text-primary">
                          {m.plan_id}
                        </span>
                        {m.sub_status && m.sub_status !== "active" && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {m.sub_status}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {m.signed_up_at ? new Date(m.signed_up_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {m.markets.length > 0 ? m.markets.join(" · ") : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.store_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.tx_count.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {fmtMoney(m.total_sales, m.primary_currency)}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-muted/10">
                      <td />
                      <td colSpan={8} className="px-3 py-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                          Stores
                        </div>
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground">
                            <tr className="text-left">
                              <th className="px-2 py-1">Name</th>
                              <th className="px-2 py-1">Created</th>
                              <th className="px-2 py-1">Market</th>
                              <th className="px-2 py-1">Rep</th>
                              <th className="px-2 py-1 text-right">Tx</th>
                              <th className="px-2 py-1 text-right">Sales</th>
                              <th className="px-2 py-1" />
                            </tr>
                          </thead>
                          <tbody>
                            {m.stores.map((s: StoreRow) => {
                              const isEditing = editing === s.id;
                              return (
                                <tr key={s.id} className="border-t border-border/30">
                                  <td className="px-2 py-1.5 font-medium">{s.name}</td>
                                  <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                                    {new Date(s.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {isEditing ? (
                                      <Input
                                        value={draft.market}
                                        onChange={(e) => setDraft({ ...draft, market: e.target.value })}
                                        className="h-7 text-xs"
                                        placeholder="DFW, LA…"
                                      />
                                    ) : (
                                      s.market || <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {isEditing ? (
                                      <Input
                                        value={draft.rep}
                                        onChange={(e) => setDraft({ ...draft, rep: e.target.value })}
                                        className="h-7 text-xs"
                                        placeholder="Rep"
                                      />
                                    ) : (
                                      s.rep || <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">
                                    {s.tx_count.toLocaleString()}
                                  </td>
                                  <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                                    {fmtMoney(s.total_sales, s.fiat_currency || "USD")}
                                  </td>
                                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                                    {isEditing ? (
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            mut.mutate({ store_id: s.id, market: draft.market, rep: draft.rep })
                                          }
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
                                          setEditing(s.id);
                                          setDraft({ market: s.market ?? "", rep: s.rep ?? "" });
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {merchants.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
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

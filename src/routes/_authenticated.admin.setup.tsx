import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listUnfinishedStores, type SetupStage, type UnfinishedStore } from "@/lib/admin-setup.functions";

export const Route = createFileRoute("/_authenticated/admin/setup")({
  component: AdminSetup,
  head: () => ({
    meta: [
      { title: "Unfinished setups · NectarPay Admin" },
      { name: "description", content: "Merchants who created a store but can't take payments yet." },
      { property: "og:title", content: "Unfinished setups · NectarPay Admin" },
      { property: "og:description", content: "Follow up with merchants who haven't finished wallet setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STAGES: { v: SetupStage; t: string; d: string }[] = [
  { v: "coins_off", t: "Wallet linked, coins off", d: "One switch away from live." },
  { v: "stopped", t: "Used to take payments", d: "Had sales, then stopped. Worth a call." },
  { v: "no_wallet", t: "No wallet linked", d: "Created a store, never linked a wallet." },
];

function AdminSetup() {
  const fn = useServerFn(listUnfinishedStores);
  const q = useQuery({ queryKey: ["admin", "unfinished-stores"], queryFn: () => fn() });
  const [stage, setStage] = useState<SetupStage | "all">("all");
  const rows = useMemo(() => (q.data ?? []).filter((r) => stage === "all" || r.stage === stage), [q.data, stage]);
  const count = (s: SetupStage) => (q.data ?? []).filter((r) => r.stage === s).length;

  const copyEmails = () => {
    const list = Array.from(new Set(rows.map((r) => r.owner_email).filter(Boolean))).join(", ");
    navigator.clipboard.writeText(list);
    toast.success("Emails copied");
  };
  const csv = () => {
    const head = "store,owner_email,city,stage,terminal,sales,last_sale,created\n";
    const body = rows.map((r: UnfinishedStore) =>
      [r.name, r.owner_email, r.city, r.stage, r.has_terminal ? "yes" : "no", r.sales, r.last_sale_at ?? "", r.created_at]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
    ).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    a.download = "unfinished-setups.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Unfinished setups</h1>
        <p className="text-sm text-muted-foreground">
          Stores that aren't hidden but have no coin switched on. They stay off the public directory until they do.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {STAGES.map((s) => (
          <button key={s.v} onClick={() => setStage(stage === s.v ? "all" : s.v)} className="text-left">
            <Card className={stage === s.v ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="text-3xl font-semibold">{q.data ? count(s.v) : "…"}</div>
                <div className="font-medium">{s.t}</div>
                <div className="text-xs text-muted-foreground">{s.d}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyEmails} disabled={!rows.length}><Copy className="mr-1 h-4 w-4" />Copy emails ({rows.length})</Button>
        <Button variant="outline" size="sm" onClick={csv} disabled={!rows.length}><Download className="mr-1 h-4 w-4" />CSV</Button>
      </div>

      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : q.error ? (
        <p className="text-sm text-destructive">{String((q.error as Error).message)}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Store</th><th className="p-2">Owner</th><th className="p-2">City</th><th className="p-2">Status</th><th className="p-2">Terminal</th><th className="p-2">Sales</th><th className="p-2">Created</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">
                    <Link to="/stores/$storeId" params={{ storeId: r.slug ?? r.id }} className="hover:underline">{r.name}</Link>
                  </td>
                  <td className="p-2">{r.owner_email ?? "—"}</td>
                  <td className="p-2">{r.city ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline">{STAGES.find((s) => s.v === r.stage)?.t}</Badge></td>
                  <td className="p-2">{r.has_terminal ? "Yes" : "—"}</td>
                  <td className="p-2">{r.sales ? `${r.sales} · last ${new Date(r.last_sale_at!).toLocaleDateString()}` : "—"}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

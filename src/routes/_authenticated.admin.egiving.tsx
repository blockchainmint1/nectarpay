import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/egiving")({
  component: AdminEgiving,
  head: () => ({
    meta: [
      { title: "eGiving recipients · NectarPay Admin" },
      { name: "description", content: "Registered church and program addresses that qualify for eGiving discounts." },
      { property: "og:title", content: "eGiving recipients · NectarPay Admin" },
      { property: "og:description", content: "Manage eligible eGiving church and program addresses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminEgiving() {
  const q = useQuery({
    queryKey: ["admin", "egiving-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("egiving_recipients").select("*").order("kind").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [kind, setKind] = useState<"church" | "program">("church");

  async function add() {
    const a = address.trim();
    if (!name.trim() || !/^[A-Za-z0-9]{25,90}$/.test(a)) {
      toast.error("Enter a name and a valid TEXITcoin address.");
      return;
    }
    const { error } = await supabase.from("egiving_recipients").insert({ address: a, kind, name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); setAddress("");
    toast.success("Added.");
    void q.refetch();
  }

  async function toggle(addr: string, active: boolean) {
    const { error } = await supabase.from("egiving_recipients").update({ active }).eq("address", addr);
    if (error) return toast.error(error.message);
    void q.refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">eGiving recipients</h1>
        <p className="text-sm text-muted-foreground">
          An eGiving payment only gets the community discount when the rest of the money goes to a church
          listed here plus the eGiving program address. Anything else is treated as an ordinary underpayment.
        </p>
      </div>

      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-center">
        <Input placeholder="Name (e.g. Christ Church of the Valley)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="TEXITcoin address" value={address} onChange={(e) => setAddress(e.target.value)} className="font-mono" />
        <div className="flex gap-1">
          {(["church", "program"] as const).map((k) => (
            <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
              {k === "church" ? "Church" : "Program"}
            </Button>
          ))}
        </div>
        <Button onClick={add}>Add</Button>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {q.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : (q.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No recipients yet. Add the program address and at least one church before testing.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.address} className="border-b border-border/60 last:border-0">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.kind === "church" ? "Church" : "Program"}</td>
                  <td className="p-3 font-mono text-xs break-all">{r.address}</td>
                  <td className="p-3 text-right"><Switch checked={r.active} onCheckedChange={(v) => toggle(r.address, v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent></Card>
    </div>
  );
}

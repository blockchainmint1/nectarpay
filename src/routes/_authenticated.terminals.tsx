// /terminals — aggregated terminals view across all the user's stores.
// Pair new devices here (pick a store), or jump into per-store management.

import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createPairingCode, revokeTerminal } from "@/lib/terminals.functions";
import { qrToDataURL } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/terminals")({
  head: () => ({ meta: [{ title: "Terminals · Nectar.Pay" }] }),
  component: TerminalsAggregatePage,
});

type TerminalRow = {
  id: string;
  store_id: string;
  label: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

function TerminalsAggregatePage() {
  const { user } = useAuth();
  const create = useServerFn(createPairingCode);
  const revoke = useServerFn(revokeTerminal);

  const storesQ = useQuery({
    queryKey: ["stores-for-terminals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const terminalsQ = useQuery({
    queryKey: ["all-terminals", user?.id],
    queryFn: async (): Promise<TerminalRow[]> => {
      const { data, error } = await supabase
        .from("terminals")
        .select("id, store_id, label, last_seen_at, revoked_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const storeMap = useMemo(
    () => Object.fromEntries((storesQ.data ?? []).map((s) => [s.id, s.name])),
    [storesQ.data],
  );

  const [selectedStore, setSelectedStore] = useState<string>("");
  useEffect(() => {
    if (!selectedStore && storesQ.data && storesQ.data.length > 0) {
      setSelectedStore(storesQ.data[0].id);
    }
  }, [storesQ.data, selectedStore]);

  const [label, setLabel] = useState("Front counter");
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string; qr: string } | null>(null);

  const createMut = useMutation({
    mutationFn: () => create({ data: { storeId: selectedStore, label: label.trim() || "Terminal" } }),
    onSuccess: async (row) => {
      const origin = window.location.origin;
      const payload = JSON.stringify({ code: row.code, api: origin });
      const qr = await qrToDataURL(payload, { width: 320, margin: 1 });
      setPairing({ code: row.code, expiresAt: row.expires_at, qr });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (terminalId: string) => revoke({ data: { terminalId } }),
    onSuccess: () => {
      toast.success("Terminal revoked.");
      terminalsQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!pairing) return;
    const tick = () => setRemaining(Math.max(0, new Date(pairing.expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairing]);
  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000).toString().padStart(2, "0");

  const noStores = storesQ.data && storesQ.data.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Terminals</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pair POS devices (Senraise H10P or any Android phone running the Nectar.Pay POS web app) to a store.
        Each device signs its API calls with its own HMAC secret. Revoke any time.
      </p>

      {noStores ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/30 p-10 text-center">
          <h3 className="font-medium">Create a store first</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Terminals are paired to a specific store so transactions land in the right place.
          </p>
          <Button asChild className="mt-4">
            <Link to="/stores/new">Create a store</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card/60 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="store-pick" className="text-xs">Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger id="store-pick" className="mt-1">
                  <SelectValue placeholder="Pick a store…" />
                </SelectTrigger>
                <SelectContent>
                  {(storesQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="terminal-label" className="text-xs">Label</Label>
              <Input
                id="terminal-label"
                className="mt-1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Front counter"
              />
            </div>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !selectedStore}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createMut.isPending ? "Issuing…" : "Pair a device"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-border">
        <div className="border-b border-border bg-card/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          Paired terminals
        </div>
        <ul className="divide-y divide-border">
          {terminalsQ.isLoading && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</li>
          )}
          {!terminalsQ.isLoading && (terminalsQ.data?.length ?? 0) === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No terminals yet.</li>
          )}
          {terminalsQ.data?.map((t) => {
            const online = !t.revoked_at && t.last_seen_at && Date.now() - new Date(t.last_seen_at).getTime() < 5 * 60_000;
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.label}</span>
                    {t.revoked_at ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-400">revoked</span>
                    ) : online ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-400">online</span>
                    ) : null}
                    <Link
                      to="/stores/$storeId/terminals"
                      params={{ storeId: t.store_id }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      · {storeMap[t.store_id] ?? "store"} <ArrowRight className="inline h-3 w-3" />
                    </Link>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {t.id.slice(0, 8)}…
                    {t.last_seen_at && <> · last seen {new Date(t.last_seen_at).toLocaleString()}</>}
                  </div>
                </div>
                {!t.revoked_at && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { if (confirm("Revoke this terminal?")) revokeMut.mutate(t.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {pairing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setPairing(null); terminalsQ.refetch(); }}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">PAIRING CODE</p>
            <div className="mt-2 font-mono text-5xl font-black tracking-[0.2em]">{pairing.code}</div>
            <p className="mt-2 text-xs text-muted-foreground">Expires in {mm}:{ss}</p>
            <div className="mt-4 inline-block rounded-lg bg-white p-2">
              <img src={pairing.qr} alt="Pairing QR" className="size-44" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              On the POS device, open <code className="font-mono">/pos/pair</code> and enter this code (or scan the QR).
            </p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => { setPairing(null); terminalsQ.refetch(); }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

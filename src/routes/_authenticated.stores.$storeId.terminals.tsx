// /stores/$storeId/terminals — merchant management for paired POS devices.

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Smartphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listTerminals, createPairingCode, revokeTerminal } from "@/lib/terminals.functions";
import { qrToDataURL } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/stores/$storeId/terminals")({
  head: () => ({ meta: [{ title: "Terminals · Nectar.Pay" }] }),
  component: TerminalsPage,
});

function TerminalsPage() {
  const { storeId } = Route.useParams();
  const list = useServerFn(listTerminals);
  const create = useServerFn(createPairingCode);
  const revoke = useServerFn(revokeTerminal);

  const { data: terminals, refetch } = useQuery({
    queryKey: ["terminals", storeId],
    queryFn: () => list({ data: { storeId } }),
  });

  const [label, setLabel] = useState("Front counter");
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string; qr: string } | null>(null);

  const createMut = useMutation({
    mutationFn: () => create({ data: { storeId, label: label.trim() || "Terminal" } }),
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
    onSuccess: () => { toast.success("Terminal revoked."); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Live countdown on the pairing modal
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link to="/stores/$storeId" params={{ storeId }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Smartphone className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Terminals</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Physical POS devices (Senraise H10P, any Android phone running our POS web app) paired to this store.
        Each terminal signs its API calls with its own HMAC secret. Revoke any time.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card/60 p-5">
        <Label htmlFor="terminal-label" className="text-xs">Label</Label>
        <div className="mt-1 flex gap-2">
          <Input id="terminal-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Front counter" />
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {createMut.isPending ? "Issuing…" : "Pair a device"}
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border">
        <div className="border-b border-border bg-card/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          Paired terminals
        </div>
        <ul className="divide-y divide-border">
          {(!terminals || terminals.length === 0) && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No terminals yet.</li>
          )}
          {terminals?.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.label}</span>
                  {t.revoked_at ? (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-400">revoked</span>
                  ) : t.last_seen_at && Date.now() - new Date(t.last_seen_at).getTime() < 5 * 60_000 ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-400">online</span>
                  ) : null}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {t.id.slice(0, 8)}…
                  {t.last_seen_at && <> · last seen {new Date(t.last_seen_at).toLocaleString()}</>}
                </div>
              </div>
              {!t.revoked_at && (
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Revoke this terminal?")) revokeMut.mutate(t.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {pairing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setPairing(null); refetch(); }}>
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
            <Button className="mt-4 w-full" variant="outline" onClick={() => { setPairing(null); refetch(); }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

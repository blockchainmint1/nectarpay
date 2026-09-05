import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getLightningAdminStatus,
  getLightningDepositAddress,
  openLightningChannel,
  runLightningSweep,
  runLightningWatcher,
} from "@/lib/lightning-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/lightning")({
  component: AdminLightning,
  head: () => ({
    meta: [
      { title: "Lightning Node · NectarPay Admin" },
      {
        name: "description",
        content:
          "Monitor the shared Bitcoin Lightning node: balances, channels, inbound liquidity, merchant payouts, and top-ups.",
      },
      { property: "og:title", content: "Lightning Node · NectarPay Admin" },
      {
        property: "og:description",
        content: "Balances, channels, liquidity and merchant payouts for the shared Lightning node.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SATS = 100_000_000;

function fmtSats(n: number) {
  return `${n.toLocaleString()} sats`;
}

function AdminLightning() {
  const status = useServerFn(getLightningAdminStatus);
  const depositAddress = useServerFn(getLightningDepositAddress);
  const openChannel = useServerFn(openLightningChannel);
  const qc = useQueryClient();

  const [address, setAddress] = useState<string | null>(null);
  const [uri, setUri] = useState("");
  const [size, setSize] = useState("2000000");
  const [fee, setFee] = useState("2");

  const q = useQuery({
    queryKey: ["admin-lightning"],
    queryFn: () => status({}),
    refetchInterval: 60_000,
  });

  const depositMut = useMutation({
    mutationFn: () => depositAddress({}),
    onSuccess: (r) => setAddress(r.address),
    onError: (e: Error) => toast.error(e.message),
  });

  const channelMut = useMutation({
    mutationFn: () =>
      openChannel({ data: { uri, amountSats: Number(size), satPerVbyte: Number(fee) } }),
    onSuccess: (r) => {
      toast.success(r.txid ? `Channel opening — funding tx ${r.txid.slice(0, 16)}…` : "Channel opening");
      setUri("");
      void qc.invalidateQueries({ queryKey: ["admin-lightning"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;
  const usd = (sats: number) => (d?.btcUsd ? `$${((sats / SATS) * d.btcUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : null);

  const inbound = d?.balances?.remoteSats ?? 0;
  const onchain = d?.balances?.onchainConfirmedSats ?? 0;
  const local = d?.balances?.localSats ?? 0;
  const owed = d?.owedSats ?? 0;

  const healthy =
    !!d?.node?.syncedToChain && (d?.node?.activeChannels ?? 0) > 0 && inbound > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Zap className="h-5 w-5 text-primary" /> Lightning node
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The shared Bitcoin Lightning node behind every merchant. Keep some bitcoin parked here so
            customer payments can reach us, then sweep the proceeds out to merchants.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Plain-English health banner */}
      <Card className={healthy ? "border-emerald-500/40" : "border-amber-500/40"}>
        <CardContent className="flex items-start gap-3 py-4">
          {healthy ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          )}
          <div className="text-sm">
            {!d ? (
              <span className="text-muted-foreground">Checking the node…</span>
            ) : !d.configured ? (
              <>The node isn't connected yet — the app is missing its address or access key.</>
            ) : d.error ? (
              <>
                Can't reach the node right now.{" "}
                <span className="text-muted-foreground">{d.error}</span>
              </>
            ) : healthy ? (
              <>
                Everything looks good. Customers can pay up to about{" "}
                <strong>{fmtSats(inbound)}</strong>
                {usd(inbound) ? ` (${usd(inbound)})` : ""} before you need to sweep or add more.
              </>
            ) : (
              <>
                Not ready to take payments yet:{" "}
                {!d.node?.syncedToChain
                  ? "the node is still catching up with the blockchain."
                  : (d.node?.activeChannels ?? 0) === 0
                    ? "no payment channels are open yet — fund the wallet, then open a channel below."
                    : "there's no room left to receive payments (inbound is 0). Sweep merchant funds out or buy more inbound liquidity."}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Balance tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Room to receive"
          hint="How much customers can still pay in total"
          value={fmtSats(inbound)}
          sub={usd(inbound)}
        />
        <Tile
          label="Received, not swept"
          hint="Sats sitting in channels on our side"
          value={fmtSats(local)}
          sub={usd(local)}
        />
        <Tile
          label="On-chain wallet"
          hint="Spare bitcoin for opening channels and paying fees"
          value={fmtSats(onchain)}
          sub={usd(onchain)}
        />
        <Tile
          label="Owed to merchants"
          hint="Not yet paid out"
          value={fmtSats(owed)}
          sub={usd(owed)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add bitcoin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add bitcoin to the node</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Get a fresh deposit address and send bitcoin from your own wallet or exchange. It shows
              up here after one confirmation (roughly 10–30 minutes).
            </p>
            <Button onClick={() => depositMut.mutate()} disabled={depositMut.isPending || !d?.configured}>
              {depositMut.isPending ? "Getting address…" : "Get deposit address"}
            </Button>
            {address ? (
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-3">
                <code className="flex-1 break-all font-mono text-xs">{address}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {d?.node?.uris?.length ? (
              <div className="pt-2">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Our node address (share to receive channels)
                </div>
                <code className="mt-1 block break-all font-mono text-xs">{d.node.uris[0]}</code>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Open channel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open a payment channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Paste the address of a well-connected node, choose a size, and we'll connect and open
              the channel using the on-chain balance above.
            </p>
            <div className="space-y-2">
              <Label htmlFor="ln-uri">Node address</Label>
              <Input
                id="ln-uri"
                placeholder="03abc…def@node.example.com:9735"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ln-size">Size (sats)</Label>
                <Input id="ln-size" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln-fee">Fee (sat/vB)</Label>
                <Input id="ln-fee" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </div>
            <Button
              onClick={() => channelMut.mutate()}
              disabled={channelMut.isPending || !uri || !d?.configured}
            >
              {channelMut.isPending ? "Opening…" : "Open channel"}
            </Button>
            <p className="text-xs text-muted-foreground">
              A channel you open gives you spending room, not receiving room. To let customers pay
              you, ask a liquidity provider to open a channel <em>to</em> our node address above.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Channels{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {d?.node ? `${d.node.activeChannels} active · ${d.node.pendingChannels} pending` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {d?.channels?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Peer</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Capacity</th>
                    <th className="px-4 py-2 text-right">Ours</th>
                    <th className="px-4 py-2 text-right">Can receive</th>
                  </tr>
                </thead>
                <tbody>
                  {d.channels.map((c) => (
                    <tr key={c.channelPoint} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{c.remotePubkey.slice(0, 20)}…</td>
                      <td className="px-4 py-2">
                        <Badge variant={c.active ? "default" : "secondary"}>
                          {c.active ? "Active" : "Offline"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">{c.capacitySats.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{c.localSats.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{c.remoteSats.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No channels open yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Owed to merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owed to merchants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {d?.owedByStore?.length ? (
            <div className="divide-y divide-border/40">
              {d.owedByStore.map((s) => (
                <div key={s.storeId} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{s.storeName}</span>
                  <span className="font-mono">{fmtSats(s.sats)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nothing owed — all swept.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Lightning invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {d?.recentInvoices?.length ? (
              <div className="divide-y divide-border/40">
                {d.recentInvoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{i.storeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(i.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{i.amountSats.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{i.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">No Lightning invoices yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent payouts (sweeps)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {d?.recentSweeps?.length ? (
              <div className="divide-y divide-border/40">
                {d.recentSweeps.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{s.storeName}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {s.address}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{s.amountSats.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{s.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">No payouts yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Tile({
  label,
  hint,
  value,
  sub,
}: {
  label: string;
  hint: string;
  value: string;
  sub: string | null;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
        {sub ? <div className="text-sm text-muted-foreground">{sub}</div> : null}
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

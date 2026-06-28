import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { ChevronLeft, Link2, Save, Pencil, Copy, Check, Settings, Smartphone, RefreshCw, ShieldCheck, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { createWalletLinkCode } from "@/lib/wallet-link.functions";
// Inlined client-safe validators (mirror src/lib/chains/derive.server.ts).
function isXpubLike(s: string): boolean {
  return /^([xtuvyz]pub)[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s.trim());
}
function isSolanaAddressLike(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}
function isTronAddressLike(s: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}
function maskSecret(s: string): string {
  const v = (s ?? "").trim();
  if (v.length <= 12) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}


export const Route = createFileRoute("/_authenticated/stores/$storeId/chains")({
  head: () => ({ meta: [{ title: "Chains · Nectar.Pay" }] }),
  component: ChainsPage,
});

type ChainKey = "btc" | "txc" | "eth" | "tron" | "sol";

type ChainMeta = {
  key: ChainKey;
  name: string;
  inputKind: "xpub" | "xpub-or-address" | "address";
  placeholder?: string;
  hint: string;
};

const CHAINS: ChainMeta[] = [
  {
    key: "txc",
    name: "TEXITcoin (TXC)",
    inputKind: "xpub",
    placeholder: "xpub6C…",
    hint: "Extended public key. A fresh address is derived per invoice. Funds land directly in your wallet — no sweep, no gas.",
  },
  {
    key: "btc",
    name: "Bitcoin (BTC)",
    inputKind: "xpub",
    placeholder: "xpub6C… / zpub… / ypub…",
    hint: "Extended public key (BIP44/49/84). Unique P2WPKH/P2PKH address per invoice.",
  },
  {
    key: "eth",
    name: "EVM (Ethereum, Base, BSC, etc.)",
    inputKind: "xpub",
    placeholder: "xpub6C… at m/44'/60'/0'",
    hint: "One account-level xpub covers every EVM chain — same derivation path (m/0/n), same addresses. Enable the chains you accept; we watch them all against this xpub.",
  },
  {
    key: "tron",
    name: "Tron (TRX / USDT-TRC20)",
    inputKind: "xpub-or-address",
    placeholder: "xpub6C… or T-address",
    hint: "Provide an xpub for unique per-invoice addresses, or a single T-address for a shared receiver.",
  },
  {
    key: "sol",
    name: "Solana (SOL / SPL)",
    inputKind: "address",
    placeholder: "Solana public key (base58)",
    hint: "Single static receive address. Ed25519 + rent-exempt accounts make per-invoice derivation impractical; reconcile via order_id.",
  },
];



// Stablecoin whitelist per chain. Mirrors SUPPORTED_STABLES_BY_CHAIN on the
// server. Kept inline because this is a client component and the server
// network module pulls in node-only crypto deps.
const STABLES_BY_CHAIN: Partial<Record<ChainKey, readonly string[]>> = {
  eth: ["ETH", "USDC", "USDT", "PYUSD", "DAI"],
  tron: ["TRX", "USDT", "USDC"],
  sol: ["SOL", "USDC", "USDT", "PYUSD"],
  // base/bsc not listed in CHAINS UI today — EVM card covers them via the
  // shared xpub. Stables for those chains will appear once they're exposed.
};

// Native tokens — rendered alongside stables under "Accept on this network",
// but labelled as the chain's native asset rather than a stablecoin.
const NATIVE_BY_CHAIN: Partial<Record<ChainKey, string>> = {
  eth: "ETH",
  tron: "TRX",
  sol: "SOL",
};

type Row = {
  id: string | null;
  chain: ChainKey;
  xpub: string | null;
  xpub_or_address: string;
  enabled: boolean;
  stables: string[];
};

function emptyRow(chain: ChainKey): Row {
  return {
    id: null,
    chain,
    xpub: null,
    xpub_or_address: "",
    enabled: false,
    stables: [],
  };
}

function ChainsPage() {
  const { storeId } = Route.useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chain-configs", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_configs")
        .select("id, chain, xpub, xpub_or_address, enabled, stables")
        .eq("store_id", storeId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [rows, setRows] = useState<Record<ChainKey, Row>>(() => {
    const init: Record<string, Row> = {};
    for (const c of CHAINS) init[c.key] = emptyRow(c.key);
    return init as Record<ChainKey, Row>;
  });

  const [suggestStables, setSuggestStables] = useState(false);

  const { data: linkInfo, refetch: refetchLink } = useQuery({
    queryKey: ["wallet-link-status", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_link_codes")
        .select("id, used_at, created_at")
        .eq("store_id", storeId)
        .not("used_at", "is", null)
        .order("used_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const isLinked = !!linkInfo;

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Row> = {};
    for (const c of CHAINS) next[c.key] = emptyRow(c.key);
    for (const r of data) {
      if (!(r.chain in next)) continue;
      next[r.chain] = {
        id: r.id,
        chain: r.chain as ChainKey,
        xpub: r.xpub,
        xpub_or_address: r.xpub_or_address ?? "",
        enabled: r.enabled,
        stables: (r.stables ?? []) as string[],
      };
    }
    setRows(next as Record<ChainKey, Row>);
  }, [data]);



  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Link2 className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Chains</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure how each chain receives payments. We never hold keys — you provide an xpub (for
        unique per-invoice addresses) or a single static receive address.
      </p>

      {isLinked ? (
        <WalletLinkedCard
          storeId={storeId}
          linkedAt={linkInfo?.used_at ?? null}
          onRelinked={() => {
            refetch();
            refetchLink();
          }}
        />
      ) : (
        <WalletLinkCard
          storeId={storeId}
          onLinked={() => {
            refetch();
            refetchLink();
            setSuggestStables(true);
          }}
        />
      )}

      <StablecoinSuggestionDialog
        open={suggestStables}
        onOpenChange={setSuggestStables}
        storeId={storeId}
        ethRow={rows.eth}
        onApplied={() => refetch()}
      />

      <StoreSettingsCard storeId={storeId} />


      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-6 space-y-4">
          {CHAINS.map((meta) => (
            <ChainCard
              key={meta.key}
              meta={meta}
              row={rows[meta.key]}
              storeId={storeId}
              onChange={(r) => setRows((prev) => ({ ...prev, [meta.key]: r }))}
              onSaved={() => refetch()}
              xpubLocked={isLinked}
            />
          ))}
        </div>

      )}
    </div>
  );
}

function StoreSettingsCard({ storeId }: { storeId: string }) {
  const { data, refetch } = useQuery({
    queryKey: ["store-payment-settings", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("default_confirmations_required, mempool_max_usd, mempool_accept_fast, mempool_accept_slow")
        .eq("id", storeId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [confs, setConfs] = useState<number>(1);
  const [mempool, setMempool] = useState<string>("");
  const [fast, setFast] = useState<boolean>(false);
  const [slow, setSlow] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setConfs(data.default_confirmations_required ?? 1);
    setMempool(data.mempool_max_usd == null ? "" : String(data.mempool_max_usd));
    setFast(!!data.mempool_accept_fast);
    setSlow(!!data.mempool_accept_slow);
  }, [data]);

  async function onSave() {
    const mRaw = mempool.trim();
    const mNum = mRaw === "" ? null : Number(mRaw);
    if (mNum != null && (!Number.isFinite(mNum) || mNum < 0)) {
      toast.error("Mempool cap must be a non-negative number, or blank.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          default_confirmations_required: Math.max(0, Number(confs) || 0),
          mempool_max_usd: mNum,
          mempool_accept_fast: fast,
          mempool_accept_slow: slow,
        })
        .eq("id", storeId);
      if (error) throw error;
      toast.success("Payment settings saved.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 ring-1 ring-primary/10">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Payment confirmation</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Account-wide settings — applied to every chain on this store.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end">
        <div>
          <Label htmlFor="default-confs" className="text-xs">Confirmations required</Label>
          <Input
            id="default-confs"
            type="number"
            min={0}
            value={confs}
            onChange={(e) => setConfs(Math.max(0, Number(e.target.value) || 0))}
          />
          <p className="mt-1 text-xs text-muted-foreground">Blocks before settlement.</p>
        </div>
        <div>
          <Label htmlFor="mempool-max" className="text-xs">Mempool (0-conf) cap (USD)</Label>
          <Input
            id="mempool-max"
            inputMode="decimal"
            placeholder="e.g. 100 — leave blank for no cap"
            value={mempool}
            onChange={(e) => setMempool(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Payments at or under this USD value can settle from the mempool — on chains you've enabled
            below. Blank = no cap (any amount).
          </p>
        </div>
        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 border-t border-primary/15 pt-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-3 hover:bg-background/70">
          <Switch checked={fast} onCheckedChange={setFast} className="mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Fast chains · accept mempool</div>
            <p className="text-xs text-muted-foreground">
              Base, BSC, Solana, Tron. Low reorg risk — typically settles in ~2s.
            </p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-3 hover:bg-background/70">
          <Switch checked={slow} onCheckedChange={setSlow} className="mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Slow chains · accept mempool</div>
            <p className="text-xs text-muted-foreground">
              Bitcoin, Ethereum L1, TXC. Higher reorg / RBF risk — best paired with a low cap.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

function ChainCard({
  meta,
  row,
  storeId,
  onChange,
  onSaved,
  xpubLocked = false,
}: {
  meta: ChainMeta;
  row: Row;
  storeId: string;
  onChange: (r: Row) => void;
  onSaved: () => void;
  xpubLocked?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const persisted = !!row.id;
  const showInput = !xpubLocked && (!persisted || editing);

  const value = meta.inputKind === "xpub" ? row.xpub ?? "" : row.xpub_or_address;

  const validation = useMemo(() => {
    const v = value.trim();
    if (!v) return { ok: false, msg: "" };
    if (meta.inputKind === "xpub") {
      return isXpubLike(v) ? { ok: true, msg: "" } : { ok: false, msg: "Doesn't look like an xpub." };
    }
    if (meta.inputKind === "address") {
      return isSolanaAddressLike(v)
        ? { ok: true, msg: "" }
        : { ok: false, msg: "Not a valid Solana address." };
    }
    if (isXpubLike(v) || isTronAddressLike(v)) return { ok: true, msg: "" };
    return { ok: false, msg: "Expected an xpub or a T-address." };
  }, [value, meta.inputKind]);

  function setValue(v: string) {
    if (meta.inputKind === "xpub") {
      onChange({ ...row, xpub: v, xpub_or_address: v });
    } else {
      onChange({ ...row, xpub_or_address: v, xpub: meta.inputKind === "xpub-or-address" && isXpubLike(v.trim()) ? v : null });
    }
  }

  async function onSave() {
    const v = value.trim();
    if (!v) {
      toast.error("Enter an xpub or address first.");
      return;
    }
    if (!validation.ok) {
      toast.error(validation.msg || "Invalid value.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        store_id: storeId,
        chain: meta.key,
        network: "mainnet",
        xpub: meta.inputKind === "address" ? null : (isXpubLike(v) ? v : null),
        xpub_or_address: v,
        enabled: row.enabled,
        stables: row.stables,
      };

      const { error } = await supabase
        .from("chain_configs")
        .upsert(payload, { onConflict: "store_id,chain" });
      if (error) {
        console.error("chain_configs upsert failed", { error, payload });
        throw new Error(error.message || error.details || error.hint || "Save failed.");
      }
      toast.success(`${meta.name} saved.`);
      setEditing(false);
      onSaved();
    } catch (e) {
      console.error("save chain failed", e);
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="rounded-lg border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{meta.name}</div>
          <p className="mt-1 text-xs text-muted-foreground">{meta.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`enabled-${meta.key}`} className="text-xs text-muted-foreground">
            Enabled
          </Label>
          <Switch
            id={`enabled-${meta.key}`}
            checked={row.enabled}
            onCheckedChange={(checked) => onChange({ ...row, enabled: checked })}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        {showInput ? (

          <div>
            <Label htmlFor={`val-${meta.key}`} className="text-xs">
              {meta.inputKind === "address"
                ? "Receive address"
                : meta.inputKind === "xpub"
                ? "Extended public key (xpub)"
                : "xpub or T-address"}
            </Label>
            <Input
              id={`val-${meta.key}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder}
              spellCheck={false}
              autoComplete="off"
              className="font-mono text-xs"
            />
            {value && !validation.ok && (
              <p className="mt-1 text-xs text-destructive">{validation.msg}</p>
            )}
          </div>
        ) : (
          <div>
            <Label className="text-xs">
              {meta.inputKind === "address" ? "Receive address" : "Saved"}
            </Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
                {maskSecret(value)}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(value);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {xpubLocked ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                  title="Locked by Beekeeper wallet — relink to change"
                >
                  <Lock className="h-3 w-3" /> Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Replace"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {STABLES_BY_CHAIN[meta.key] && STABLES_BY_CHAIN[meta.key]!.length > 0 && (
        <div className="mt-4 rounded-md border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Accept on this network</p>
            <p className="text-[11px] text-muted-foreground">
              All tokens land at the same address as the native asset.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {STABLES_BY_CHAIN[meta.key]!.map((sym) => {
              const checked = row.stables.includes(sym);
              const isNative = NATIVE_BY_CHAIN[meta.key] === sym;
              return (
                <label
                  key={sym}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition",
                    checked
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border/80",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...row.stables, sym]))
                        : row.stables.filter((s) => s !== sym);
                      onChange({ ...row, stables: next });
                    }}
                  />
                  <span>{sym}</span>
                  {isNative && (
                    <span className="rounded bg-muted/60 px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      native
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Pick exactly what you want to accept — leave the native asset off if you only want stablecoins. On-chain detection for stablecoins is rolling out and we'll watch your address for these tokens automatically as it ships.
          </p>
        </div>
      )}
    </div>
  );
}

function WalletLinkCard({ storeId, onLinked }: { storeId: string; onLinked: () => void }) {
  const createCode = useServerFn(createWalletLinkCode);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const [allowNewWallet, setAllowNewWallet] = useState(false);

  // Tick once a second for countdown.
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const expired = expiresAt != null && now >= expiresAt;
  const secondsLeft = expiresAt == null ? 0 : Math.max(0, Math.floor((expiresAt - now) / 1000));

  // Poll for the token being consumed.
  useEffect(() => {
    if (!token || expired || linked) return;
    const hash = token; // we don't have sha256 client-side; instead query by used_at across our codes
    void hash;
    const i = setInterval(async () => {
      const { data } = await supabase
        .from("wallet_link_codes")
        .select("id, used_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.used_at) {
        setLinked(true);
        toast.success("Wallet linked — xpubs imported.");
        onLinked();
      }
    }, 2500);
    return () => clearInterval(i);
  }, [token, expired, linked, storeId, onLinked]);

  async function onGenerate() {
    setBusy(true);
    setLinked(false);
    try {
      const result = await createCode({ data: { storeId, allowNewWallet } });
      const origin = window.location.origin;
      // QR is a plain HTTPS URL — the wallet is a web/PWA, custom schemes
      // don't fire. Wallet GETs this to fetch the link manifest, then POSTs
      // the signed xpubs back to callback_url from the manifest.
      const linkUrl = `${origin}/api/public/v1/wallet-link?token=${encodeURIComponent(result.token)}`;
      const qr = await QRCode.toDataURL(linkUrl, { width: 320, margin: 1 });
      setQrDataUrl(qr);
      setToken(result.token);
      setExpiresAt(new Date(result.expires_at).getTime());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue link code.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setToken(null);
    setExpiresAt(null);
    setQrDataUrl(null);
    setLinked(false);
  }

  return (
    <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-medium">Link a Beekeeper.money wallet</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Skip the copy-paste. Scan this QR with the Beekeeper.money wallet on your phone and it
            pushes your xpubs for every chain it supports (BTC, TXC, EVM, LTC, BCH, DOGE, TRX) in
            one tap. Chains stay disabled until you flip them on — and we Telegram-alert you the
            moment any xpub on this store changes.
          </p>

          {!token && (
            <>
              <label className="mt-4 flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={allowNewWallet}
                  onChange={(e) => setAllowNewWallet(e.target.checked)}
                />
                <span className="text-muted-foreground">
                  This is a <strong className="text-foreground">new wallet</strong> I haven't signed
                  into Nectar with yet. Beekeeper will show a warning before signing, and we'll
                  register this wallet to your account on first use.
                </span>
              </label>
              <Button className="mt-3" onClick={onGenerate} disabled={busy}>
                <Smartphone className="mr-2 h-4 w-4" />
                {busy ? "Generating…" : "Generate link code"}
              </Button>
            </>
          )}


          {token && qrDataUrl && (
            <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
              <div className="rounded-md border border-border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Wallet link QR" className="h-48 w-48" />
              </div>
              <div className="flex-1 text-xs">
                {linked ? (
                  <div className="flex items-center gap-2 text-emerald-500">
                    <ShieldCheck className="h-4 w-4" />
                    Wallet linked. Review xpubs below and flip on the chains you accept.
                  </div>
                ) : expired ? (
                  <div className="text-destructive">Code expired — generate a new one.</div>
                ) : (
                  <>
                    <div className="font-medium">Scan with the Beekeeper.money wallet</div>
                    <div className="mt-1 text-muted-foreground">
                      Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </div>
                  </>
                )}
                <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  {linked ? "Done" : "Cancel"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function StablecoinSuggestionDialog({
  open,
  onOpenChange,
  storeId,
  ethRow,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  ethRow: Row;
  onApplied: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onAgree() {
    setBusy(true);
    try {
      const suggested = ["USDT", "USDC", "PYUSD"];
      const mergedStables = Array.from(new Set([...(ethRow.stables ?? []), ...suggested]));
      const payload = {
        store_id: storeId,
        chain: "eth" as const,
        network: "mainnet",
        xpub: ethRow.xpub,
        xpub_or_address: ethRow.xpub_or_address || ethRow.xpub || "",
        enabled: true,
        stables: mergedStables,
      };
      const { error } = await supabase
        .from("chain_configs")
        .upsert(payload, { onConflict: "store_id,chain" });
      if (error) throw error;
      toast.success("EVM stablecoins enabled — USDT, USDC, PYUSD.");
      onApplied();
      onOpenChange(false);
    } catch (e) {
      console.error("enable stables failed", e);
      toast.error(e instanceof Error ? e.message : "Could not enable stablecoins.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Enable stablecoins on EVM?
          </AlertDialogTitle>
          <AlertDialogDescription>
            We suggest turning on <span className="font-medium text-foreground">USDT</span>,{" "}
            <span className="font-medium text-foreground">USDC</span>, and{" "}
            <span className="font-medium text-foreground">PYUSD</span> on EVM for starters — the
            most-used dollar rails your customers already hold. Native ETH stays off unless you
            tick it below. You can change all of this anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={onAgree} disabled={busy}>
            {busy ? "Enabling…" : "Agreed — enable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WalletLinkedCard({
  storeId,
  linkedAt,
  onRelinked,
}: {
  storeId: string;
  linkedAt: string | null;
  onRelinked: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [relinking, setRelinking] = useState(false);

  return (
    <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Beekeeper.money wallet linked</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
              <Lock className="h-3 w-3" /> xpubs locked
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your xpubs are managed by the linked Beekeeper wallet
            {linkedAt ? ` (since ${new Date(linkedAt).toLocaleDateString()})` : ""}. To replace
            any xpub, re-link with a fresh wallet signature — we'll Telegram-alert you the moment
            it happens. Enabled chains and accepted assets remain editable here.
          </p>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setConfirmOpen(true)}
            disabled={relinking}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Re-link wallet to change xpubs
          </Button>
        </div>
      </div>

      {relinking && (
        <div className="mt-4">
          <WalletLinkCard
            storeId={storeId}
            onLinked={() => {
              setRelinking(false);
              onRelinked();
            }}
          />
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Re-link Beekeeper wallet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Replacing xpubs requires a fresh signature from your Beekeeper wallet. Anyone
              scanning the next QR can overwrite the xpubs on this store, so only generate it
              when you're ready to scan from the wallet that owns the funds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRelinking(true);
                setConfirmOpen(false);
              }}
            >
              Generate re-link QR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

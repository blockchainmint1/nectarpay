import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Link2, Save, Pencil, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  head: () => ({ meta: [{ title: "Chains · payHME" }] }),
  component: ChainsPage,
});

type ChainKey = "btc" | "txc" | "eth" | "tron" | "sol";

type ChainMeta = {
  key: ChainKey;
  name: string;
  // What value the merchant provides.
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



type Row = {
  id: string | null;
  chain: ChainKey;
  xpub: string | null;
  xpub_or_address: string;
  enabled: boolean;
  confirmations_required: number;
  zero_conf_max_usd: string; // free text in the form; "" = disabled
  qr_address_only: boolean;
};

function emptyRow(chain: ChainKey): Row {
  return {
    id: null,
    chain,
    xpub: null,
    xpub_or_address: "",
    enabled: false,
    confirmations_required: 1,
    zero_conf_max_usd: "",
    qr_address_only: false,
  };
}

function ChainsPage() {
  const { storeId } = Route.useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chain-configs", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_configs")
        .select("id, chain, xpub, xpub_or_address, enabled, confirmations_required, zero_conf_max_usd, qr_address_only")
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
        confirmations_required: r.confirmations_required ?? 1,
        zero_conf_max_usd: r.zero_conf_max_usd == null ? "" : String(r.zero_conf_max_usd),
        qr_address_only: !!r.qr_address_only,
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

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-8 space-y-4">
          {CHAINS.map((meta) => (
            <ChainCard
              key={meta.key}
              meta={meta}
              row={rows[meta.key]}
              storeId={storeId}
              onChange={(r) => setRows((prev) => ({ ...prev, [meta.key]: r }))}
              onSaved={() => refetch()}
            />
          ))}
        </div>

      )}
    </div>
  );
}

function ChainCard({
  meta,
  row,
  storeId,
  onChange,
  onSaved,
}: {
  meta: ChainMeta;
  row: Row;
  storeId: string;
  onChange: (r: Row) => void;
  onSaved: () => void;

}) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const persisted = !!row.id;
  const showInput = !persisted || editing;

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
    // xpub-or-address (tron)
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
      const zcRaw = row.zero_conf_max_usd.trim();
      const zcNum = zcRaw === "" ? null : Number(zcRaw);
      if (zcNum != null && (!Number.isFinite(zcNum) || zcNum < 0)) {
        toast.error("Mempool threshold must be a non-negative number, or blank.");
        setSaving(false);
        return;
      }
      const payload = {
        store_id: storeId,
        chain: meta.key,
        network: "mainnet",
        xpub: meta.inputKind === "address" ? null : (isXpubLike(v) ? v : null),
        xpub_or_address: v,
        enabled: row.enabled,
        confirmations_required: row.confirmations_required,
        zero_conf_max_usd: zcNum,
        qr_address_only: row.qr_address_only,
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

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto] md:items-end">
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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground"
                title="Replace"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor={`conf-${meta.key}`} className="text-xs">
            Confirmations
          </Label>
          <Input
            id={`conf-${meta.key}`}
            type="number"
            min={0}
            value={row.confirmations_required}
            onChange={(e) =>
              onChange({ ...row, confirmations_required: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </div>
        <Button onClick={onSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Advanced merchant controls */}
      <div className="mt-4 grid gap-4 border-t border-border/60 pt-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`zc-${meta.key}`} className="text-xs">
            Accept mempool (0-conf) up to (USD)
          </Label>
          <Input
            id={`zc-${meta.key}`}
            inputMode="decimal"
            placeholder="e.g. 25 — leave blank to always require confirmations"
            value={row.zero_conf_max_usd}
            onChange={(e) => onChange({ ...row, zero_conf_max_usd: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Payments at or under this USD value clear as soon as we see them in the mempool. Above it, we wait for the confirmations above.
          </p>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <div>
            <Label htmlFor={`qr-${meta.key}`} className="text-xs">
              Address-only QR
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Off: QR includes the chain URI and amount (e.g. <code className="font-mono">texitcoin:…?amount=…</code>). On: QR contains just the address — for wallets that can't parse advanced URIs.
            </p>
          </div>
          <Switch
            id={`qr-${meta.key}`}
            checked={row.qr_address_only}
            onCheckedChange={(checked) => onChange({ ...row, qr_address_only: checked })}
          />
        </div>
      </div>
    </div>
  );
}



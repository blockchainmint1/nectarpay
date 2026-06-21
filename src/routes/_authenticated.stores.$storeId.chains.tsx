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

export const Route = createFileRoute("/_authenticated/stores/$storeId/chains")({
  head: () => ({ meta: [{ title: "Chains · payHME" }] }),
  component: ChainsPage,
});

type ChainKey = "btc" | "txc" | "eth" | "base" | "tron" | "sol";

type ChainMeta = {
  key: ChainKey;
  name: string;
  // What value the merchant provides.
  inputKind: "xpub" | "xpub-or-address" | "address" | "mirrors-eth";
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
    name: "Ethereum (ETH)",
    inputKind: "xpub",
    placeholder: "xpub6C… at m/44'/60'/0'",
    hint: "Account-level xpub. Each invoice gets a fresh derived address (m/0/n). Treasury sweeping comes later — for now funds sit on the derived addresses.",
  },
  {
    key: "base",
    name: "Base",
    inputKind: "mirrors-eth",
    hint: "Base is EVM and shares ETH's derivation path — we reuse your ETH xpub automatically. Just toggle it on.",
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
};

function emptyRow(chain: ChainKey): Row {
  return {
    id: null,
    chain,
    xpub: null,
    xpub_or_address: "",
    enabled: false,
    confirmations_required: 1,
  };
}

function ChainsPage() {
  const { storeId } = Route.useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chain-configs", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_configs")
        .select("id, chain, xpub, xpub_or_address, enabled, confirmations_required")
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
              ethXpub={rows.eth?.xpub ?? null}
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
  ethXpub,
  onChange,
  onSaved,
}: {
  meta: ChainMeta;
  row: Row;
  storeId: string;
  ethXpub: string | null;
  onChange: (r: Row) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const persisted = !!row.id;
  const showInput = !persisted || editing;


  const mirrors = meta.inputKind === "mirrors-eth";
  const value = meta.inputKind === "xpub" ? row.xpub ?? "" : row.xpub_or_address;

  const validation = useMemo(() => {
    if (mirrors) return { ok: true, msg: "" };
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
  }, [value, meta.inputKind, mirrors]);

  function setValue(v: string) {
    if (meta.inputKind === "xpub") {
      onChange({ ...row, xpub: v, xpub_or_address: v });
    } else if (meta.inputKind === "xpub-or-address" || meta.inputKind === "address") {
      onChange({ ...row, xpub_or_address: v, xpub: meta.inputKind === "xpub-or-address" && isXpubLike(v.trim()) ? v : null });
    }
  }

  async function onSave() {
    let v = value.trim();
    if (mirrors) {
      if (!ethXpub) {
        toast.error("Set your Ethereum xpub first — Base reuses it.");
        return;
      }
      v = ethXpub;
    } else {
      if (!v) {
        toast.error("Enter an xpub or address first.");
        return;
      }
      if (!validation.ok) {
        toast.error(validation.msg || "Invalid value.");
        return;
      }
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
        confirmations_required: row.confirmations_required,
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
        {mirrors ? (
          <div className="text-xs text-muted-foreground">
            {ethXpub
              ? "Using your Ethereum xpub. Each invoice gets a fresh derived address."
              : "No Ethereum xpub set yet. Add one above, then enable Base."}
          </div>
        ) : (
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
        <Button onClick={onSave} disabled={saving || (mirrors && !ethXpub)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}


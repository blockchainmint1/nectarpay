// Drag-and-drop reorder of the store's enabled crypto payment options.
// Renders a live mockup of the POS terminal chain picker so the merchant can
// see exactly what the customer sees. Reordering writes display_order to
// chain_configs and the POS /options endpoint reads back ordered.
//
// Scope: chains are reorderable; their stablecoin options follow each chain
// in the order returned by the same NATIVE/SUPPORTED_STABLES tables the POS
// terminal uses, so this preview matches the terminal exactly.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Loader2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  SUPPORTED_STABLES_BY_CHAIN,
  evmChainsForStable,
  EVM_CHAIN_LABEL,
} from "@/lib/chains/networks";

const NATIVE_LABEL: Record<string, string> = {
  btc: "Bitcoin",
  txc: "TEXITcoin",
  eth: "Ethereum",
  base: "Base",
  bsc: "BNB Smart Chain",
  tron: "Tron",
  sol: "Solana",
  doge: "Dogecoin",
  isk: "Iskander",
  zcu: "ZCU",
};

function joinNetworks(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

type ChainRow = {
  id: string;
  chain: string;
  stables: string[];
};

export function ChainOrderEditor({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["chain-order", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_configs")
        .select("id, chain, stables, display_order")
        .eq("store_id", storeId)
        .eq("enabled", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        chain: r.chain as string,
        stables: (r.stables ?? []) as string[],
      })) as ChainRow[];
    },
  });

  const [order, setOrder] = useState<ChainRow[] | null>(null);
  useEffect(() => { if (rows) setOrder(rows); }, [rows]);

  const dirty = useMemo(() => {
    if (!rows || !order) return false;
    if (rows.length !== order.length) return true;
    return rows.some((r, i) => r.id !== order[i].id);
  }, [rows, order]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !order) return;
    const oldIdx = order.findIndex((r) => r.id === active.id);
    const newIdx = order.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setOrder(arrayMove(order, oldIdx, newIdx));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!order) return;
      // Per-row updates so each goes through RLS (owns_store). Small N.
      await Promise.all(
        order.map((r, i) =>
          supabase
            .from("chain_configs")
            .update({ display_order: i })
            .eq("id", r.id)
            .then(({ error }) => { if (error) throw error; }),
        ),
      );
    },
    onSuccess: () => {
      toast.success("Payment option order saved");
      qc.invalidateQueries({ queryKey: ["chain-order", storeId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…
        </div>
      </Card>
    );
  }

  if (!order || order.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Payment option order</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          No chains enabled for this store yet. Add one from the Chains page first.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Payment option order</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag to reorder. This is exactly what the customer sees on the terminal chain picker.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
        >
          {save.isPending ? "Saving…" : dirty ? "Save order" : "Saved"}
        </Button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_minmax(260px,320px)]">
        {/* Reorder controls */}
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {order.map((row) => (
                  <SortableRow key={row.id} row={row} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Stablecoins on each chain follow that chain automatically.
          </p>
        </div>

        {/* Live terminal mockup */}
        <TerminalMockup order={order} />
      </div>
    </Card>
  );
}

function SortableRow({ row }: { row: ChainRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const stableCount = expandedOptions(row).length - 1;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{NATIVE_LABEL[row.chain] ?? row.chain.toUpperCase()}</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {row.chain}
          {stableCount > 0 && <> · +{stableCount} stablecoin{stableCount === 1 ? "" : "s"}</>}
        </div>
      </div>
    </li>
  );
}

// Expand a ChainRow into the same option list the POS terminal renders:
// the native chain first, then each enabled stablecoin under it.
function expandedOptions(row: ChainRow): { key: string; label: string; sub: string }[] {
  const out: { key: string; label: string; sub: string }[] = [];
  const chain = row.chain;
  out.push({
    key: chain,
    label: NATIVE_LABEL[chain] ?? chain.toUpperCase(),
    sub: chain,
  });
  const allow = (SUPPORTED_STABLES_BY_CHAIN as Record<string, readonly string[] | undefined>)[chain] ?? [];
  const enabled = row.stables.map((s) => s.toUpperCase());
  for (const sym of allow) {
    if (!enabled.includes(sym)) continue;
    let label: string;
    if (chain === "eth") {
      const nets = evmChainsForStable(sym).map((k) => EVM_CHAIN_LABEL[k]);
      label = `${sym} on ${joinNetworks(nets)}`;
    } else {
      label = `${sym} on ${NATIVE_LABEL[chain] ?? chain.toUpperCase()}`;
    }
    out.push({ key: `${chain}:${sym}`, label, sub: `${sym} · ${chain}` });
  }
  return out;
}

function TerminalMockup({ order }: { order: ChainRow[] }) {
  const flat = order.flatMap(expandedOptions);
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="rounded-xl bg-[#0a0d12] p-3 text-white">
        <div className="flex items-center justify-between text-[9px] font-bold tracking-[0.25em] text-emerald-300/90">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            NECTAR.PAY · POS
          </span>
          <span className="text-white/40">PREVIEW</span>
        </div>
        <div className="mt-3 text-center">
          <p className="text-[9px] font-bold tracking-[0.25em] text-white/50">CUSTOMER PAYS WITH</p>
          <div className="mt-0.5 text-2xl font-black tabular-nums">$24.00</div>
        </div>
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
          {flat.map((o) => (
            <div
              key={o.key}
              className="flex items-center justify-between rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold">{o.label}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-white/40">
                  {o.sub}
                </div>
              </div>
              <span className="ml-2 text-white/40">→</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-white/15 px-3 py-2.5">
              <div className="text-[12px] font-bold">Let customer pick</div>
              <span className="ml-2 text-white/40">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

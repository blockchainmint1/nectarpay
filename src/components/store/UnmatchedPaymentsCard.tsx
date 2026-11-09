import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  applyUnmatchedPayment,
  dismissUnmatchedPayment,
  listUnmatchedPayments,
} from "@/lib/unmatched-payments.functions";

const money = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

/**
 * Payments that reached the store's single Ethereum/Base/BSC address but
 * couldn't be matched to one sale. Hidden when there are none.
 */
export function UnmatchedPaymentsCard({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listUnmatchedPayments);
  const apply = useServerFn(applyUnmatchedPayment);
  const dismiss = useServerFn(dismissUnmatchedPayment);
  const [choice, setChoice] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["unmatched-payments", storeId],
    queryFn: () => list({ data: { store_id: storeId } }),
    refetchInterval: 60_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["unmatched-payments", storeId] });

  const applyMut = useMutation({
    mutationFn: (v: { payment_id: string; invoice_id: string }) => apply({ data: v }),
    onSuccess: (r) => { toast.success(`Payment applied — sale is now ${r.status}.`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const dismissMut = useMutation({
    mutationFn: (payment_id: string) => dismiss({ data: { payment_id } }),
    onSuccess: () => { toast.success("Marked as not a sale."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payments = data?.payments ?? [];
  if (!payments.length) return null;
  const sales = data?.sales ?? [];

  return (
    <section className="mt-8 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 text-primary" />
        Payments waiting for a sale ({payments.length})
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        These reached your wallet, but the amount didn't match exactly one sale, so we didn't guess.
        The money is already in your wallet — pick the sale it was for, or mark it as not a sale.
      </p>
      <ul className="mt-4 space-y-3">
        {payments.map((p) => {
          const options = sales.filter(
            (s) => (s.address ?? "").toLowerCase() === p.address.toLowerCase()
              && (s.token_symbol ?? "").toUpperCase() === (p.token_symbol ?? "").toUpperCase(),
          );
          const picked = choice[p.id] ?? "";
          return (
            <li key={p.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-mono text-sm">
                  {Number(p.amount)} {p.token_symbol ?? p.chain.toUpperCase()}
                  <span className="ml-2 text-xs text-muted-foreground">on {p.chain.toUpperCase()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.block_time ?? p.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Sale this payment was for"
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  value={picked}
                  onChange={(e) => setChoice((c) => ({ ...c, [p.id]: e.target.value }))}
                >
                  <option value="">{options.length ? "Choose the sale…" : "No recent unpaid sale on this coin"}</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {money(Number(s.fiat_amount), s.fiat_currency ?? "USD")} · {Number(s.crypto_amount)} ·{" "}
                      {new Date(s.created_at).toLocaleString()} · {s.status}
                      {s.description ? ` · ${s.description}` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!picked || applyMut.isPending}
                  onClick={() => applyMut.mutate({ payment_id: p.id, invoice_id: picked })}
                >
                  Apply to sale
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={dismissMut.isPending}
                  onClick={() => dismissMut.mutate(p.id)}
                >
                  Not a sale
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

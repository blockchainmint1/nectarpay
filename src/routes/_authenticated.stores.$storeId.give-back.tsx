import { useStoreRef } from "@/lib/store-ref";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, HeartHandshake, Lock, Save, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EGIVING_DISCOUNT_PCT } from "@/lib/egiving";

export const Route = createFileRoute("/_authenticated/stores/$storeId/give-back")({
  head: () => ({ meta: [{ title: "Give Back · Nectar.Pay" }] }),
  component: GiveBackPage,
});

function GiveBackPage() {
  const { storeId, storeSlug } = useStoreRef();

  const { data, refetch } = useQuery({
    queryKey: ["store-give-back", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("egiving_enabled, egiving_discount_pct")
        .eq("id", storeId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [egiving, setEgiving] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEgiving(!!data.egiving_enabled);
  }, [data]);

  async function onSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ egiving_enabled: egiving })
        .eq("id", storeId);
      if (error) throw error;
      toast.success("Give Back settings saved.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const merchantPct = 100 - EGIVING_DISCOUNT_PCT;
  const churchPct = 8;
  const programPct = EGIVING_DISCOUNT_PCT - churchPct;

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId: storeSlug }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to store
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HeartHandshake className="h-4 w-4" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Give Back</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Let customers who give to their church pay you from the same payment. You take the same
        sale — a slice of what they spend goes to their church and the eGiving program on the way
        through, and we still mark your share as paid in full.
      </p>

      <div className="mt-8 max-w-3xl rounded-lg border border-border bg-card/60 p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/40 p-4 hover:bg-background/70">
            <Switch checked={egiving} onCheckedChange={setEgiving} className="mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Accept eGiving community payments</div>
              <p className="mt-1 text-xs text-muted-foreground">
                eGiving customers pay in TSD with one split payment: you receive your share and the
                rest goes to their church and the eGiving program. Your share counts as paid in
                full — the difference is recorded as a community discount on the sale.
              </p>
            </div>
          </label>
          <div>
            <Label htmlFor="egiving-pct" className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3 w-3" aria-hidden />
              Community discount (%)
            </Label>
            <Input
              id="egiving-pct"
              inputMode="decimal"
              value={String(data?.egiving_discount_pct ?? EGIVING_DISCOUNT_PCT)}
              readOnly
              aria-readonly
              tabIndex={-1}
              className="bg-muted text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Fixed at {EGIVING_DISCOUNT_PCT}% for now — the eGiving wallet sends {churchPct}% to
              the customer's church and {programPct}% to the program, so every store uses the same
              split.
            </p>
          </div>
        </div>

        <Button onClick={onSave} size="sm" className="mt-5" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div className="mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/40 p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Where a ${merchantPct + EGIVING_DISCOUNT_PCT} sale goes</div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>${(merchantPct / 10).toFixed(2)} — your store, marked paid in full</li>
            <li>${(churchPct / 10).toFixed(2)} — the customer's church</li>
            <li>${(programPct / 10).toFixed(2)} — the eGiving program</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            One payment, one tap. Nothing extra to collect and nothing to send on afterward.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card/40 p-5">
          <div className="text-sm font-medium">Good to know</div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>Works with TSD on TEXITcoin only.</li>
            <li>Customer rewards and your store rewards are earned on the full sale.</li>
            <li>The church and program shares can't be refunded.</li>
            <li>Only churches and programs we've approved can receive a share.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 max-w-3xl">
        <Link
          to="/reports/egiving"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <BarChart3 className="h-4 w-4" /> See your eGiving totals and monthly breakdown
        </Link>
      </div>
    </div>
  );
}

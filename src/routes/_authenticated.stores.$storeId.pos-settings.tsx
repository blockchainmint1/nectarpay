// Per-store POS terminal experience settings.
// Toggles for tip step, signature capture, emailed receipts, plus the
// receipt header (business name, address, logo URL, footer, tax ID).
// These flow to every paired terminal at this store via the /options API.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ChainOrderEditor } from "@/components/pos-settings/chain-order-editor";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stores/$storeId/pos-settings")({
  head: () => ({ meta: [{ title: "POS terminal experience · Nectar.Pay" }] }),
  component: PosSettingsPage,
});

interface Draft {
  pos_tip_enabled: boolean;
  pos_signature_enabled: boolean;
  pos_email_receipt_enabled: boolean;
  receipt_business_name: string;
  receipt_address: string;
  receipt_logo_url: string;
  receipt_footer: string;
  receipt_tax_id: string;
}

function PosSettingsPage() {
  const { storeId } = Route.useParams();
  const qc = useQueryClient();

  const { data: store, isLoading, error } = useQuery({
    queryKey: ["store-pos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select(
          "id, name, pos_tip_enabled, pos_signature_enabled, pos_email_receipt_enabled, receipt_business_name, receipt_address, receipt_logo_url, receipt_footer, receipt_tax_id",
        )
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Store not found or you don't have access.");
      return data;
    },
    retry: false,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (!store) return;
    setDraft({
      pos_tip_enabled: store.pos_tip_enabled ?? true,
      pos_signature_enabled: store.pos_signature_enabled ?? false,
      pos_email_receipt_enabled: store.pos_email_receipt_enabled ?? false,
      receipt_business_name: store.receipt_business_name ?? store.name ?? "",
      receipt_address: store.receipt_address ?? "",
      receipt_logo_url: store.receipt_logo_url ?? "",
      receipt_footer: store.receipt_footer ?? "",
      receipt_tax_id: store.receipt_tax_id ?? "",
    });
  }, [store]);

  const save = useMutation({
    mutationFn: async (next: Draft) => {
      const { error } = await supabase
        .from("stores")
        .update({
          pos_tip_enabled: next.pos_tip_enabled,
          pos_signature_enabled: next.pos_signature_enabled,
          pos_email_receipt_enabled: next.pos_email_receipt_enabled,
          receipt_business_name: emptyToNull(next.receipt_business_name),
          receipt_address: emptyToNull(next.receipt_address),
          receipt_logo_url: emptyToNull(next.receipt_logo_url),
          receipt_footer: emptyToNull(next.receipt_footer),
          receipt_tax_id: emptyToNull(next.receipt_tax_id),
        })
        .eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("POS settings saved");
      qc.invalidateQueries({ queryKey: ["store-pos", storeId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <Link to="/stores" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> All stores
        </Link>
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-semibold text-destructive">Couldn't load POS settings</div>
          <p className="mt-1 text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !draft || !store) {
    return <div className="px-8 py-10 text-sm text-muted-foreground">Loading…</div>;
  }


  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <Link
        to="/stores/$storeId"
        params={{ storeId }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {store.name}
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">POS terminal experience</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These settings apply to every paired terminal at this store.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Checkout flow</h2>
          <p className="mt-1 text-xs text-muted-foreground">Toggle steps the cashier or customer sees during a sale.</p>

          <div className="mt-4 space-y-4">
            <ToggleRow
              label="Tip step"
              hint="Show the tip presets screen between amount and chain pick."
              checked={draft.pos_tip_enabled}
              onChange={(v) => setDraft({ ...draft, pos_tip_enabled: v })}
            />
            <ToggleRow
              label="Signature capture"
              hint="Ask the customer to sign on-screen after payment. Optional for crypto since there are no chargebacks."
              checked={draft.pos_signature_enabled}
              onChange={(v) => setDraft({ ...draft, pos_signature_enabled: v })}
            />
            <ToggleRow
              label="Email receipt"
              hint="Prompt the customer for an email after payment and send a branded receipt."
              checked={draft.pos_email_receipt_enabled}
              onChange={(v) => setDraft({ ...draft, pos_email_receipt_enabled: v })}
            />
          </div>
        </Card>
        <ChainOrderEditor storeId={storeId} />


        <Card className="p-5">
          <h2 className="text-sm font-semibold">Receipt header</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on the on-screen "paid" view and emailed receipts.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Business name">
              <Input
                value={draft.receipt_business_name}
                onChange={(e) => setDraft({ ...draft, receipt_business_name: e.target.value })}
                placeholder={store.name ?? "Acme Coffee"}
              />
            </Field>
            <Field label="Tax / VAT ID">
              <Input
                value={draft.receipt_tax_id}
                onChange={(e) => setDraft({ ...draft, receipt_tax_id: e.target.value })}
                placeholder="optional"
              />
            </Field>
            <Field label="Logo URL" className="md:col-span-2">
              <Input
                type="url"
                value={draft.receipt_logo_url}
                onChange={(e) => setDraft({ ...draft, receipt_logo_url: e.target.value })}
                placeholder="https://… (PNG/SVG, displayed at ~120px tall)"
              />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={draft.receipt_address}
                onChange={(e) => setDraft({ ...draft, receipt_address: e.target.value })}
                placeholder="123 Main St&#10;Brooklyn, NY 11201"
              />
            </Field>
            <Field label="Footer note" className="md:col-span-2">
              <Textarea
                rows={2}
                value={draft.receipt_footer}
                onChange={(e) => setDraft({ ...draft, receipt_footer: e.target.value })}
                placeholder="Thanks for paying in crypto! · Returns within 30 days with receipt."
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

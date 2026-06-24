// Per-store POS terminal experience settings.
// Everything here is OPTIONAL and OFF by default — the cashier-facing POS
// looks exactly the same until a merchant turns something on. Sections are
// collapsed accordions so the page doesn't overwhelm; tap to reveal advanced
// reconciliation, money-handling, receipt, and fleet defaults.

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChainOrderEditor } from "@/components/pos-settings/chain-order-editor";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stores/$storeId/pos-settings")({
  head: () => ({ meta: [{ title: "POS terminal experience · Nectar.Pay" }] }),
  component: PosSettingsPage,
});

interface QuickItem { label: string; amount: number; ext_ref?: string }
interface CustomTender { label: string }

interface Draft {
  // existing
  pos_tip_enabled: boolean;
  pos_signature_enabled: boolean;
  pos_email_receipt_enabled: boolean;
  receipt_business_name: string;
  receipt_address: string;
  receipt_logo_url: string;
  receipt_footer: string;
  receipt_tax_id: string;
  // reconciliation
  ext_ref_mode: "off" | "prompt_before" | "prompt_after";
  ext_ref_required: boolean;
  ext_ref_label: string;
  ext_ref_scan_mode: boolean;
  tax_mode: "none" | "inclusive" | "added";
  tax_bps: number;
  // operator
  pos_require_cashier_pin: boolean;
  pos_quick_items: QuickItem[];
  pos_custom_tenders: CustomTender[];
  // receipt delivery
  receipt_email_enabled: boolean;
  receipt_sms_enabled: boolean;
  receipt_reprint_enabled: boolean;
  // money handling
  pos_refund_enabled: boolean;
  pos_void_enabled: boolean;
  pos_hold_enabled: boolean;
  pos_other_tender_enabled: boolean;
  pos_eod_enabled: boolean;
  pos_refund_reasons: string[];
  // fleet defaults
  default_allowed_chains: string[];
  default_display_currency: string;
}

const SELECT_COLS = [
  "id, name",
  "pos_tip_enabled, pos_signature_enabled, pos_email_receipt_enabled",
  "receipt_business_name, receipt_address, receipt_logo_url, receipt_footer, receipt_tax_id",
  "ext_ref_mode, ext_ref_required, ext_ref_label, ext_ref_scan_mode",
  "tax_mode, tax_bps",
  "pos_require_cashier_pin, pos_quick_items, pos_custom_tenders",
  "receipt_email_enabled, receipt_sms_enabled, receipt_reprint_enabled",
  "pos_refund_enabled, pos_void_enabled, pos_hold_enabled, pos_other_tender_enabled, pos_eod_enabled, pos_refund_reasons",
  "default_allowed_chains, default_display_currency",
].join(", ");

function PosSettingsPage() {
  const { storeId } = Route.useParams();
  const qc = useQueryClient();

  const { data: store, isLoading, error } = useQuery({
    queryKey: ["store-pos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select(SELECT_COLS)
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Store not found or you don't have access.");
      return data as unknown as Record<string, unknown> & { id: string; name: string };
    },
    retry: false,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (!store) return;
    const s = store as Record<string, unknown> & { name: string };
    setDraft({
      pos_tip_enabled: (s.pos_tip_enabled as boolean) ?? true,
      pos_signature_enabled: (s.pos_signature_enabled as boolean) ?? false,
      pos_email_receipt_enabled: (s.pos_email_receipt_enabled as boolean) ?? false,
      receipt_business_name: (s.receipt_business_name as string) ?? s.name ?? "",
      receipt_address: (s.receipt_address as string) ?? "",
      receipt_logo_url: (s.receipt_logo_url as string) ?? "",
      receipt_footer: (s.receipt_footer as string) ?? "",
      receipt_tax_id: (s.receipt_tax_id as string) ?? "",
      ext_ref_mode: ((s.ext_ref_mode as Draft["ext_ref_mode"]) ?? "off"),
      ext_ref_required: (s.ext_ref_required as boolean) ?? false,
      ext_ref_label: (s.ext_ref_label as string) ?? "",
      ext_ref_scan_mode: (s.ext_ref_scan_mode as boolean) ?? false,
      tax_mode: ((s.tax_mode as Draft["tax_mode"]) ?? "none"),
      tax_bps: (s.tax_bps as number) ?? 0,
      pos_require_cashier_pin: (s.pos_require_cashier_pin as boolean) ?? false,
      pos_quick_items: ((s.pos_quick_items as QuickItem[]) ?? []),
      pos_custom_tenders: ((s.pos_custom_tenders as CustomTender[]) ?? []),
      receipt_email_enabled: (s.receipt_email_enabled as boolean) ?? false,
      receipt_sms_enabled: (s.receipt_sms_enabled as boolean) ?? false,
      receipt_reprint_enabled: (s.receipt_reprint_enabled as boolean) ?? true,
      pos_refund_enabled: (s.pos_refund_enabled as boolean) ?? false,
      pos_void_enabled: (s.pos_void_enabled as boolean) ?? false,
      pos_hold_enabled: (s.pos_hold_enabled as boolean) ?? false,
      pos_other_tender_enabled: (s.pos_other_tender_enabled as boolean) ?? false,
      pos_eod_enabled: (s.pos_eod_enabled as boolean) ?? false,
      pos_refund_reasons: ((s.pos_refund_reasons as string[]) ?? []),
      default_allowed_chains: ((s.default_allowed_chains as string[]) ?? []),
      default_display_currency: (s.default_display_currency as string) ?? "",
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
          ext_ref_mode: next.ext_ref_mode,
          ext_ref_required: next.ext_ref_required,
          ext_ref_label: emptyToNull(next.ext_ref_label),
          ext_ref_scan_mode: next.ext_ref_scan_mode,
          tax_mode: next.tax_mode,
          tax_bps: next.tax_bps,
          pos_require_cashier_pin: next.pos_require_cashier_pin,
          pos_quick_items: next.pos_quick_items,
          pos_custom_tenders: next.pos_custom_tenders,
          receipt_email_enabled: next.receipt_email_enabled,
          receipt_sms_enabled: next.receipt_sms_enabled,
          receipt_reprint_enabled: next.receipt_reprint_enabled,
          pos_refund_enabled: next.pos_refund_enabled,
          pos_void_enabled: next.pos_void_enabled,
          pos_hold_enabled: next.pos_hold_enabled,
          pos_other_tender_enabled: next.pos_other_tender_enabled,
          pos_eod_enabled: next.pos_eod_enabled,
          pos_refund_reasons: next.pos_refund_reasons,
          default_allowed_chains: next.default_allowed_chains.length
            ? next.default_allowed_chains
            : null,
          default_display_currency: emptyToNull(next.default_display_currency),
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

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft({ ...draft, [key]: value });

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
          Defaults that apply to every paired terminal at this store. Anything you leave off stays
          hidden from the cashier.
        </p>
      </div>

      {/* Visible-by-default basics */}
      <div className="mt-8 space-y-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Checkout flow</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Toggle steps the cashier or customer sees during a sale.
          </p>

          <div className="mt-4 space-y-4">
            <ToggleRow
              label="Tip step"
              hint="Show the tip presets screen between amount and chain pick."
              checked={draft.pos_tip_enabled}
              onChange={(v) => update("pos_tip_enabled", v)}
            />
            <ToggleRow
              label="Signature capture"
              hint="Ask the customer to sign on-screen after payment. Optional for crypto."
              checked={draft.pos_signature_enabled}
              onChange={(v) => update("pos_signature_enabled", v)}
            />
            <ToggleRow
              label="Email receipt"
              hint="Prompt the customer for an email after payment and send a branded receipt."
              checked={draft.pos_email_receipt_enabled}
              onChange={(v) => update("pos_email_receipt_enabled", v)}
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
                onChange={(e) => update("receipt_business_name", e.target.value)}
                placeholder={store.name ?? "Acme Coffee"}
              />
            </Field>
            <Field label="Tax / VAT ID">
              <Input
                value={draft.receipt_tax_id}
                onChange={(e) => update("receipt_tax_id", e.target.value)}
                placeholder="optional"
              />
            </Field>
            <Field label="Logo URL" className="md:col-span-2">
              <Input
                type="url"
                value={draft.receipt_logo_url}
                onChange={(e) => update("receipt_logo_url", e.target.value)}
                placeholder="https://… (PNG/SVG, displayed at ~120px tall)"
              />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={draft.receipt_address}
                onChange={(e) => update("receipt_address", e.target.value)}
                placeholder="123 Main St&#10;Brooklyn, NY 11201"
              />
            </Field>
            <Field label="Footer note" className="md:col-span-2">
              <Textarea
                rows={2}
                value={draft.receipt_footer}
                onChange={(e) => update("receipt_footer", e.target.value)}
                placeholder="Thanks for paying in crypto! · Returns within 30 days with receipt."
              />
            </Field>
          </div>
        </Card>

        {/* Quiet, opt-in advanced sections — collapsed by default */}
        <Card className="p-2">
          <Accordion type="multiple" className="w-full">
            {/* Reconciliation */}
            <AccordionItem value="recon" className="border-b last:border-b-0">
              <AccordionTrigger className="px-3 text-sm font-semibold hover:no-underline">
                Reconciliation
                <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground">
                  External reference · scan · tax
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 pt-1 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Tie a Nectar invoice back to your POS, ticketing, or cart system.
                </p>

                <Field label="External reference prompt">
                  <select
                    value={draft.ext_ref_mode}
                    onChange={(e) => update("ext_ref_mode", e.target.value as Draft["ext_ref_mode"])}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="off">Off — no prompt</option>
                    <option value="prompt_before">Prompt before charge</option>
                    <option value="prompt_after">Prompt after payment</option>
                  </select>
                </Field>

                {draft.ext_ref_mode !== "off" && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Field label">
                        <Input
                          value={draft.ext_ref_label}
                          onChange={(e) => update("ext_ref_label", e.target.value)}
                          placeholder="Order # · Ticket · Table"
                        />
                      </Field>
                      <div className="space-y-3">
                        <ToggleRow
                          label="Required"
                          hint="Cashier must enter a value before continuing."
                          checked={draft.ext_ref_required}
                          onChange={(v) => update("ext_ref_required", v)}
                        />
                        <ToggleRow
                          label="Barcode/QR scan mode"
                          hint="Auto-focus the field for keyboard-wedge scanners."
                          checked={draft.ext_ref_scan_mode}
                          onChange={(v) => update("ext_ref_scan_mode", v)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <Field label="Tax mode">
                    <select
                      value={draft.tax_mode}
                      onChange={(e) => update("tax_mode", e.target.value as Draft["tax_mode"])}
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="none">None</option>
                      <option value="inclusive">Tax-inclusive (price already includes tax)</option>
                      <option value="added">Tax added at checkout</option>
                    </select>
                  </Field>
                  {draft.tax_mode !== "none" && (
                    <Field label="Tax rate (%)" className="mt-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        value={(draft.tax_bps / 100).toString()}
                        onChange={(e) =>
                          update("tax_bps", Math.round(parseFloat(e.target.value || "0") * 100))
                        }
                      />
                    </Field>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Operator */}
            <AccordionItem value="operator" className="border-b last:border-b-0">
              <AccordionTrigger className="px-3 text-sm font-semibold hover:no-underline">
                Operator controls
                <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground">
                  Quick items · custom tenders · PIN
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 pt-1 space-y-4">
                <ToggleRow
                  label="Require cashier PIN on terminal"
                  hint="Forces every paired terminal to set a 4-digit unlock PIN."
                  checked={draft.pos_require_cashier_pin}
                  onChange={(v) => update("pos_require_cashier_pin", v)}
                />

                <div>
                  <div className="text-xs font-medium text-muted-foreground">Quick-item buttons</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Shortcut buttons on the POS home grid. Empty list = nothing shown.
                  </p>
                  <StringListEditor
                    items={draft.pos_quick_items.map((q) => `${q.label}|${q.amount}`)}
                    onChange={(items) =>
                      update(
                        "pos_quick_items",
                        items
                          .map((s) => {
                            const [label, amount] = s.split("|");
                            return { label: label.trim(), amount: Number(amount) || 0 };
                          })
                          .filter((q) => q.label && q.amount > 0),
                      )
                    }
                    placeholder='Latte|4.50'
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground">Custom tender labels</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Quick-fill values for the reference field (e.g. "Table 1" – "Table 12").
                  </p>
                  <StringListEditor
                    items={draft.pos_custom_tenders.map((t) => t.label)}
                    onChange={(items) =>
                      update(
                        "pos_custom_tenders",
                        items.filter(Boolean).map((label) => ({ label })),
                      )
                    }
                    placeholder="Table 4"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Receipt delivery */}
            <AccordionItem value="receipt-delivery" className="border-b last:border-b-0">
              <AccordionTrigger className="px-3 text-sm font-semibold hover:no-underline">
                Receipt delivery
                <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground">
                  Email · SMS · reprint
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 pt-1 space-y-4">
                <ToggleRow
                  label="Email receipt button"
                  hint="Adds a 'send to email' button on the paid screen."
                  checked={draft.receipt_email_enabled}
                  onChange={(v) => update("receipt_email_enabled", v)}
                />
                <ToggleRow
                  label="SMS receipt button"
                  hint="Adds a 'text receipt' button. Pricing applies."
                  checked={draft.receipt_sms_enabled}
                  onChange={(v) => update("receipt_sms_enabled", v)}
                />
                <ToggleRow
                  label="Allow reprint"
                  hint="Cashier can pull up a paid invoice from history and reprint."
                  checked={draft.receipt_reprint_enabled}
                  onChange={(v) => update("receipt_reprint_enabled", v)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Money handling */}
            <AccordionItem value="money" className="border-b last:border-b-0">
              <AccordionTrigger className="px-3 text-sm font-semibold hover:no-underline">
                Money handling
                <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground">
                  Refund · void · hold · cash · EOD
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 pt-1 space-y-4">
                <ToggleRow
                  label="Refunds"
                  hint="Show 'Refund' on paid invoices. Records the request; on-chain payout is reviewed."
                  checked={draft.pos_refund_enabled}
                  onChange={(v) => update("pos_refund_enabled", v)}
                />
                <ToggleRow
                  label="Voids"
                  hint="Cancel an unpaid invoice from the cashier UI."
                  checked={draft.pos_void_enabled}
                  onChange={(v) => update("pos_void_enabled", v)}
                />
                <ToggleRow
                  label="Hold / open tabs"
                  hint="Set an invoice aside and recall it by label."
                  checked={draft.pos_hold_enabled}
                  onChange={(v) => update("pos_hold_enabled", v)}
                />
                <ToggleRow
                  label="Other tender (cash, card, etc.)"
                  hint="Record non-crypto sales so end-of-day totals match."
                  checked={draft.pos_other_tender_enabled}
                  onChange={(v) => update("pos_other_tender_enabled", v)}
                />
                <ToggleRow
                  label="End-of-day report"
                  hint="Z-report style summary the cashier can pull at close."
                  checked={draft.pos_eod_enabled}
                  onChange={(v) => update("pos_eod_enabled", v)}
                />

                {draft.pos_refund_enabled && (
                  <div className="border-t pt-3">
                    <div className="text-xs font-medium text-muted-foreground">Refund reasons</div>
                    <StringListEditor
                      items={draft.pos_refund_reasons}
                      onChange={(items) => update("pos_refund_reasons", items.filter(Boolean))}
                      placeholder="Customer request"
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Fleet defaults */}
            <AccordionItem value="fleet" className="border-b last:border-b-0">
              <AccordionTrigger className="px-3 text-sm font-semibold hover:no-underline">
                Fleet defaults
                <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground">
                  Apply to new terminals
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 pt-1 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Per-terminal overrides live on the Terminals page. These are defaults applied
                  when a new device pairs.
                </p>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Default allowed chains (lowercase keys, e.g. <code>btc</code>, <code>txc</code>, <code>eth</code>, <code>base</code>)
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Empty = every chain enabled on the store is allowed.
                  </p>
                  <StringListEditor
                    items={draft.default_allowed_chains}
                    onChange={(items) =>
                      update(
                        "default_allowed_chains",
                        items.map((s) => s.trim().toLowerCase()).filter(Boolean),
                      )
                    }
                    placeholder="btc"
                  />
                </div>
                <Field label="Default display currency (ISO, e.g. USD)">
                  <Input
                    value={draft.default_display_currency}
                    onChange={(e) =>
                      update("default_display_currency", e.target.value.toUpperCase().slice(0, 3))
                    }
                    placeholder="USD"
                  />
                </Field>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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

function StringListEditor({
  items, onChange, placeholder,
}: { items: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  return (
    <div className="mt-2 space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={it}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        + Add
      </Button>
    </div>
  );
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

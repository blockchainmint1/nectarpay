import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Save, Nfc } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/stores/$storeId/tangem")({
  head: () => ({ meta: [{ title: "Tap-to-Pay (Tangem) · Nectar.Pay" }] }),
  component: TangemSettingsPage,
});

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function TangemSettingsPage() {
  const { storeId } = Route.useParams();
  const [address, setAddress] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("usdc_payout_address_eth")
        .eq("id", storeId)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
      } else {
        const v = data?.usdc_payout_address_eth ?? "";
        setAddress(v);
        setInitial(v);
      }
      setLoading(false);
    })();
  }, [storeId]);

  const dirty = address.trim() !== initial;
  const valid = address === "" || ETH_ADDRESS.test(address.trim());

  async function save() {
    if (!valid) {
      toast.error("Enter a valid Ethereum address (0x + 40 hex chars) or leave blank.");
      return;
    }
    setSaving(true);
    const value = address.trim() === "" ? null : address.trim();
    const { error } = await supabase
      .from("stores")
      .update({ usdc_payout_address_eth: value })
      .eq("id", storeId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInitial(value ?? "");
    toast.success("Payout address saved.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/stores/$storeId"
          params={{ storeId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Nfc className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tap-to-Pay with Tangem</h1>
            <p className="text-sm text-muted-foreground">
              Customers tap a Tangem hardware wallet on your terminal to pay in USDC on Ethereum.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <Label htmlFor="usdc-eth" className="text-sm font-medium">
            USDC (Ethereum) payout address
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            The address that receives USDC from every tap-to-pay transaction on this store.
          </p>
          <Input
            id="usdc-eth"
            className="mt-3 font-mono"
            placeholder="0x…"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {!valid && (
            <p className="mt-2 text-xs text-destructive">
              Not a valid Ethereum address.
            </p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Leave blank to disable Tangem tap-to-pay for this store.
            </p>
            <Button
              onClick={save}
              disabled={!dirty || !valid || saving || loading}
              size="sm"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          <h2 className="font-medium text-foreground">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Customer taps their Tangem card on the back of your NectarPOS terminal.</li>
            <li>Tangem's secure element signs the transaction inside the card.</li>
            <li>Nectar.Pay broadcasts to Ethereum. USDC lands at the address above.</li>
          </ol>
          <p className="mt-3">
            <Link to="/docs/tap-to-pay-tangem" className="text-primary hover:underline">
              Read the full docs →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

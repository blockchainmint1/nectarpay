import { useStoreRef } from "@/lib/store-ref";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Save, Nfc, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PendingChangeBanner, keyActivationTime } from "@/components/store/KeyChangeStepUp";
import { cancelTangemPayout, getTangemPayout, saveTangemPayout } from "@/lib/tangem-payout.functions";
import { requestWalletLinkVerification } from "@/lib/wallet-link.functions";

export const Route = createFileRoute("/_authenticated/stores/$storeId/tangem")({
  head: () => ({ meta: [{ title: "Tap-to-Pay (Tangem) · Nectar.Pay" }] }),
  component: TangemSettingsPage,
});

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function TangemSettingsPage() {
  const { storeId, storeSlug } = useStoreRef();
  const getPayout = useServerFn(getTangemPayout);
  const savePayout = useServerFn(saveTangemPayout);
  const cancelPayout = useServerFn(cancelTangemPayout);
  const requestCode = useServerFn(requestWalletLinkVerification);
  const [address, setAddress] = useState("");
  const [initial, setInitial] = useState("");
  const [pending, setPending] = useState<{ address: string; activatesAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codePrompt, setCodePrompt] = useState<{ sentTo: string; value: string } | null>(null);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await getPayout({ data: { storeId } });
      setAddress(r.current ?? "");
      setInitial(r.current ?? "");
      setPending(r.pending && r.activatesAt ? { address: r.pending, activatesAt: r.activatesAt } : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the payout address.");
    } finally {
      setLoading(false);
    }
  }, [getPayout, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = address.trim() !== initial;
  const valid = address === "" || ETH_ADDRESS.test(address.trim());

  async function submit(value: string | null, verificationCode?: string) {
    const res = await savePayout({ data: { storeId, address: value, verificationCode } });
    if (res.status === "code_required") {
      const sent = await requestCode({ data: { storeId } });
      setCode("");
      setCodePrompt({ sentTo: sent.sent_to, value: value ?? "" });
      return;
    }
    setCodePrompt(null);
    if (res.status === "scheduled") {
      toast.success(
        `New payout address saved. For your safety it takes over ${keyActivationTime(res.activatesAt)} — tap-to-pay keeps paying the current address until then.`,
        { duration: 10_000 },
      );
    } else if (res.status === "cleared") {
      toast.success("Payout address removed. Tangem tap-to-pay is off for this store.");
    }
    await load();
  }

  async function save() {
    if (!valid) {
      toast.error("Enter a valid Ethereum address (0x + 40 hex chars) or leave blank.");
      return;
    }
    setSaving(true);
    try {
      await submit(address.trim() === "" ? null : address.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmCode() {
    if (!codePrompt) return;
    setSaving(true);
    try {
      await submit(codePrompt.value, code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[90rem] px-6 py-10">
        <Link
          to="/stores/$storeId"
          params={{ storeId: storeSlug }}
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
          {pending ? (
            <PendingChangeBanner
              storeId={storeId}
              title={`New payout address waiting: takes over ${keyActivationTime(pending.activatesAt)}`}
              detail={pending.address}
              onCancel={async (verificationCode) => {
                const r = await cancelPayout({ data: { storeId, verificationCode } });
                return r.status === "code_required" ? "code_required" : "cancelled";
              }}
              cancelledMessage="Payout change cancelled — the current address stays."
              onChanged={() => void load()}
            />
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Leave blank to disable Tangem tap-to-pay for this store. A new address needs an emailed code and takes over after 4 hours.
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

        <Dialog open={!!codePrompt} onOpenChange={(o) => { if (!o) setCodePrompt(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Confirm this payout change
              </DialogTitle>
              <DialogDescription>
                We emailed a 6-digit code to {codePrompt?.sentTo ?? "your email"}. Changing where payments go always needs it.
              </DialogDescription>
            </DialogHeader>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-lg tracking-[0.4em]"
              aria-label="6-digit code from your email"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCodePrompt(null)} disabled={saving}>Cancel</Button>
              <Button onClick={confirmCode} disabled={saving || code.length !== 6}>
                {saving ? "Checking…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

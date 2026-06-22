import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldAlert, Loader2, ExternalLink } from "lucide-react";

import { getInvoiceKycRequirement, runBasicKyc, startAdvancedKyc } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function KycGate({
  invoiceId,
  buyerAddressHint,
  onPassed,
}: {
  invoiceId: string;
  buyerAddressHint?: string | null;
  onPassed: () => void;
}) {
  const getReq = useServerFn(getInvoiceKycRequirement);
  const runBasic = useServerFn(runBasicKyc);
  const startAdv = useServerFn(startAdvancedKyc);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["kyc-req", invoiceId],
    queryFn: () => getReq({ data: { invoiceId } }),
  });

  const [wallet, setWallet] = useState(buyerAddressHint ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);

  if (isLoading || !data || !data.found) return null;
  if (data.level === "none" || data.status === "passed") {
    // Either no KYC required, or already passed — allow checkout.
    if (data.status === "passed") onPassed();
    return null;
  }

  async function onBasicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setReasons([]);
    try {
      const res = await runBasic({
        data: { invoiceId, walletAddress: wallet || undefined, email: email || undefined },
      });
      if (res.status === "passed") {
        onPassed();
        refetch();
      } else {
        setReasons(res.reasons);
      }
    } catch (err) {
      setReasons([err instanceof Error ? err.message : "Verification failed."]);
    } finally {
      setBusy(false);
    }
  }

  async function onAdvancedStart() {
    setBusy(true);
    try {
      const res = await startAdv({
        data: { invoiceId, returnUrl: window.location.href },
      });
      window.location.href = res.redirectUrl;
    } catch (err) {
      setReasons([err instanceof Error ? err.message : "Could not start verification."]);
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-500" />
        <div className="flex-1">
          <div className="font-medium">Quick verification required</div>
          <p className="mt-1 text-xs text-muted-foreground">
            This merchant requires {data.level === "advanced" ? "identity verification" : "a basic wallet & region check"} before payment. Nectar.Pay does not store your personal data.
          </p>

          {data.level === "basic" ? (
            <form onSubmit={onBasicSubmit} className="mt-4 grid gap-3">
              <div>
                <Label htmlFor="kyc-wallet" className="text-xs">Your sending wallet address</Label>
                <Input
                  id="kyc-wallet"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x… / bc1… / Sol address"
                  className="mt-1 font-mono text-xs"
                  required
                />
              </div>
              {data.requireEmail && (
                <div>
                  <Label htmlFor="kyc-email" className="text-xs">Email (for receipt only)</Label>
                  <Input
                    id="kyc-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              )}
              <Button type="submit" size="sm" disabled={busy} className="w-full">
                {busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                Run checks
              </Button>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">
                You'll be redirected to <span className="font-medium">{data.providerLabel}</span> to verify.
                Documents stay with them — Nectar.Pay only receives pass/fail.
              </p>
              <Button onClick={onAdvancedStart} size="sm" disabled={busy} className="mt-3">
                {busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ExternalLink className="mr-2 h-3 w-3" />}
                Continue to {data.providerLabel}
              </Button>
            </div>
          )}

          {reasons.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <ul className="space-y-1">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

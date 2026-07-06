// Dev harness for Tangem tap-to-pay. Simulates the two RPCs the APK
// makes, without needing a real card or a Capacitor build:
//
//   1. Paste an invoice UUID + a card public key → click "Start"
//      → we call startTangemPayment, show the hashToSign
//   2. Paste the 128-hex signature (r || s) the card would return →
//      click "Submit" → we call submitTangemPayment, show broadcast hash
//
// This validates the server side end-to-end. On a real device the APK
// wraps the same two calls around the Tangem SDK's scan + signHash.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { startTangemPayment, submitTangemPayment } from "@/lib/tangem-pay.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dev/tangem-test")({
  head: () => ({
    meta: [
      { title: "Tangem Tap-to-Pay Test Harness | NectarPOS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TangemTestPage,
});

type StartResult = Awaited<ReturnType<typeof startTangemPayment>>;
type SubmitResult = Awaited<ReturnType<typeof submitTangemPayment>>;

function TangemTestPage() {
  const start = useServerFn(startTangemPayment);
  const submit = useServerFn(submitTangemPayment);

  const [invoiceId, setInvoiceId] = useState("");
  const [cardPublicKey, setCardPublicKey] = useState("");
  const [cardId, setCardId] = useState("");
  const [startResult, setStartResult] = useState<StartResult | null>(null);

  const [signatureHex, setSignatureHex] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onStart() {
    setError(null);
    setStartResult(null);
    setSubmitResult(null);
    setBusy(true);
    try {
      const res = await start({ data: { invoiceId, cardPublicKey, cardId: cardId || undefined } });
      setStartResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!startResult) return;
    setError(null);
    setSubmitResult(null);
    setBusy(true);
    try {
      const res = await submit({ data: { intentId: startResult.intentId, signatureHex } });
      setSubmitResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Tangem Tap-to-Pay Test Harness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate the APK → server round-trips without a real card. Use a pending USDC invoice on an
          ETH-xpub-configured store for a full end-to-end run.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>1. Start payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="invoiceId">Invoice ID (UUID)</Label>
            <Input id="invoiceId" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="e.g. 5f0b9b2e-..." />
          </div>
          <div>
            <Label htmlFor="cardPublicKey">Card public key (128 or 130 hex, uncompressed secp256k1)</Label>
            <Input id="cardPublicKey" value={cardPublicKey} onChange={(e) => setCardPublicKey(e.target.value)}
              placeholder="04ab...cd" />
          </div>
          <div>
            <Label htmlFor="cardId">Card ID (optional, from NFC read)</Label>
            <Input id="cardId" value={cardId} onChange={(e) => setCardId(e.target.value)} />
          </div>
          <Button onClick={onStart} disabled={busy || !invoiceId || !cardPublicKey}>Start</Button>
          {startResult && (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{JSON.stringify(startResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Submit signature</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            On device, the APK sends the <code>hashToSign</code> above to the Tangem card's <code>SIGN_HASH</code>
            APDU, which returns a 64-byte (128 hex) r||s signature.
          </p>
          <div>
            <Label htmlFor="signatureHex">Signature hex (128 chars, r||s, no v)</Label>
            <Input id="signatureHex" value={signatureHex} onChange={(e) => setSignatureHex(e.target.value)}
              placeholder="paste 128-hex sig from card" />
          </div>
          <Button onClick={onSubmit} disabled={busy || !startResult || !signatureHex}>Submit</Button>
          {submitResult && (
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{JSON.stringify(submitResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
    </main>
  );
}

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveCheckoutContact } from "@/lib/customers.functions";
import { marketingConsentText } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail, Check } from "lucide-react";

export function CustomerContactForm({ invoiceId, storeName, paid }: { invoiceId: string; storeName: string; paid: boolean }) {
  const save = useServerFn(saveCheckoutContact);
  const [email, setEmail] = useState("");
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  return <section className="border-t border-border pt-5">
    <h2 className="flex items-center gap-2 text-base font-medium"><Mail className="size-4 text-primary" /> Email receipt</h2>
    {saved ? <p role="status" className="mt-3 flex items-center gap-2 text-sm text-success"><Check className="size-4" />{paid ? "Receipt sent." : "Your receipt will be sent after payment."}{optedIn ? ` You’re signed up for ${storeName} updates.` : ""}</p> :
      <form className="mt-3 space-y-3" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError("");
        try { await save({ data: { invoiceId, email, marketing_opt_in: optedIn } }); setSaved(true); }
        catch (e) { setError(e instanceof Error ? e.message : "Could not save email."); }
        finally { setBusy(false); }
      }}>
        <Label htmlFor="checkout-receipt-email">Email address (optional)</Label>
        <div className="flex flex-wrap gap-2"><Input id="checkout-receipt-email" className="min-w-0 flex-1" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /><Button type="submit" disabled={busy}>{busy ? "Saving…" : paid ? "Send receipt" : "Save email"}</Button></div>
        <label className="flex cursor-pointer items-start gap-2 text-sm"><Checkbox aria-label={marketingConsentText(storeName)} checked={optedIn} onCheckedChange={v => setOptedIn(v === true)} /><span>{marketingConsentText(storeName)}</span></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>}
  </section>;
}
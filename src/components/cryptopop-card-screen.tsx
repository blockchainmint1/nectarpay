import { useEffect, useRef, useState } from "react";
import { Nfc, Delete, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NectarNfc, isNative } from "@/lib/pos-native";
import { signedJson, type TerminalCreds } from "@/lib/pos-client";
import { CARD_APPROVAL_TIMEOUT_MS, CARD_POLL_INTERVAL_MS, type CardReply } from "@/lib/cryptopop-card";

export function CryptoPopCardScreen({ creds, invoiceId, totalCents, onPaid, onUseQr, onCancel }: {
  creds: TerminalCreds; invoiceId: string; totalCents: number;
  onPaid: () => void; onUseQr: () => void; onCancel: () => void;
}) {
  const [phase, setPhase] = useState<"tap" | "sending" | "pin" | "approval" | "error">("tap");
  const [reason, setReason] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [payment, setPayment] = useState<{ id: string; token: string; started: number } | null>(null);
  const uid = useRef<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  function handle(reply: CardReply) {
    if (!alive.current) return;
    if (reply.status === "sent" && reply.txid) { setPayment(null); onPaid(); return; }
    if (reply.status === "pin_required") { setPin(""); setReason(reply.reason); setPhase("pin"); return; }
    if ((reply.status === "approval_required" || reply.status === "sending") && reply.payment_id && reply.poll_token) {
      const next = { id: reply.payment_id, token: reply.poll_token, started: Date.now() };
      setPayment(current => current ?? next);
      setPhase(reply.status === "sending" ? "sending" : "approval");
      return;
    }
    setPayment(null); uid.current = null;
    setReason(reply.reason || (reply.status === "declined" ? "Card declined." : "Payment failed. Check the sale before retrying."));
    setPhase("error");
  }

  async function send(cardUid: string, pinValue?: string) {
    if (busy.current || payment) return;
    busy.current = true;
    setPhase("sending"); setPin(""); setReason(null);
    try {
      handle(await signedJson<CardReply>(creds, `/api/public/v1/terminals/invoice/${invoiceId}/card-pay`, {
        method: "POST", body: { card_uid: cardUid, ...(pinValue ? { pin: pinValue } : {}) },
      }));
    } catch (error) {
      if (alive.current) { uid.current = null; setReason(error instanceof Error ? error.message : "Payment request failed."); setPhase("error"); }
    } finally { busy.current = false; }
  }

  useEffect(() => {
    if (!payment) return;
    const pendingPayment = payment;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      if (stopped) return;
      if (Date.now() - pendingPayment.started >= CARD_APPROVAL_TIMEOUT_MS) {
        setPayment(null); setReason("Approval timed out. Check the sale before retrying."); setPhase("error"); uid.current = null; return;
      }
      try {
        const reply = await signedJson<CardReply>(creds, `/api/public/v1/terminals/invoice/${invoiceId}/card-pay`, {
          method: "POST", body: { payment_id: pendingPayment.id, poll_token: pendingPayment.token },
        });
        if (stopped) return;
        if (reply.status !== "approval_required" && reply.status !== "sending") { handle(reply); return; }
        setPhase(reply.status === "sending" ? "sending" : "approval");
      } catch { /* brief network outage: do not submit a second payment */ }
      if (!stopped) timer = setTimeout(tick, CARD_POLL_INTERVAL_MS);
    }
    timer = setTimeout(tick, CARD_POLL_INTERVAL_MS);
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [payment, creds, invoiceId]);

  useEffect(() => {
    let stopped = false;
    let subscription: { remove: () => Promise<void> } | undefined;
    void NectarNfc.start(event => {
      if (stopped || busy.current || uid.current) return;
      if (!event.uid) { setReason("Couldn't read that card — try tapping again."); return; }
      setReason(null);
      uid.current = event.uid;
      void send(event.uid);
    }, message => { if (!stopped) { setReason(message); setPhase("error"); } }).then(sub => {
      if (stopped) void sub.remove(); else subscription = sub;
    }).catch((e) => { if (!stopped) { setReason(e instanceof Error && e.message ? e.message : "Could not start the NFC reader."); setPhase("error"); } });
    return () => { stopped = true; if (subscription) void subscription.remove(); };
  }, [creds, invoiceId]);

  function press(key: string) {
    if (key === "C") setPin("");
    else if (key === "delete") setPin(current => current.slice(0, -1));
    else setPin(current => current.length < 8 ? current + key : current);
  }

  const pending = phase === "sending" || phase === "approval";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-background px-4 py-6 text-center text-foreground">
      <p className="text-xs font-semibold text-muted-foreground">CryptoPOP CARD · TSD</p>
      <div className="mt-1 text-4xl font-bold tabular-nums">{(totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
      <div className="my-6 flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4">
        {phase === "tap" && <><Nfc className="size-24 text-primary" /><p className="text-lg font-bold">Tap your CryptoPOP card</p>{reason && <p role="alert" className="text-sm text-destructive">{reason}</p>}{!isNative() && <p className="text-xs text-destructive">NFC reader unavailable on this device.</p>}</>}
        {phase === "sending" && <><LoaderCircle className="size-12 animate-spin motion-reduce:animate-none text-primary" /><p className="text-lg font-bold">Sending payment…</p></>}
        {phase === "approval" && <><p className="text-lg font-bold">Waiting for the cardholder’s approval…</p><p className="text-sm text-muted-foreground">Approve or decline in Telegram.</p></>}
        {phase === "pin" && <>
          <p className="text-lg font-bold">Enter your card PIN</p>
          {reason && <p role="alert" className="text-sm text-destructive">{reason}</p>}
          <div aria-label={`${pin.length} PIN digits entered`} className="h-10 font-mono text-3xl">{"•".repeat(pin.length)}</div>
          <div className="grid w-full grid-cols-3 gap-2">{["1","2","3","4","5","6","7","8","9","C","0","delete"].map(key => <Button key={key} variant="secondary" aria-label={key === "C" ? "Clear PIN" : key === "delete" ? "Delete PIN digit" : key} onClick={() => press(key)} className="h-14 rounded-lg text-xl">{key === "delete" ? <Delete /> : key === "C" ? <X /> : key}</Button>)}</div>
          <Button disabled={pin.length < 4 || busy.current} onClick={() => { if (uid.current) void send(uid.current, pin); }} className="h-12 w-full rounded-lg font-bold">Pay</Button>
        </>}
        {phase === "error" && <><p role="alert" className="text-lg font-semibold text-destructive">{reason}</p><Button onClick={() => { uid.current = null; setPin(""); setReason(null); setPhase("tap"); }} className="h-12 w-full rounded-lg">Try again</Button></>}
      </div>
      <div className="flex w-full max-w-sm gap-2">
        <Button variant="outline" disabled={pending} onClick={onCancel} className="h-11 flex-1 rounded-lg">Cancel</Button>
        <Button variant="outline" disabled={pending} onClick={onUseQr} className="h-11 flex-1 rounded-lg">Show QR</Button>
      </div>
    </div>
  );
}
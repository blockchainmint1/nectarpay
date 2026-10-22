import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PartCollector } from "@/lib/vault-link/qr-parts";
import { linkVaultPairing, previewVaultPairing } from "@/lib/vault-link.functions";
import { requestWalletLinkVerification } from "@/lib/wallet-link.functions";

type Preview = Awaited<ReturnType<typeof previewVaultPairing>>;
const LABEL: Record<string, string> = { txc: "TEXITcoin (TXC + TSD)", btc: "Bitcoin", ltc: "Litecoin", doge: "Dogecoin", eth: "EVM (ETH/Base/BSC)" };

function MultiFrameScanner({ onDone, onError }: { onDone: (text: string) => void; onError: (m: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState<{ have: number; total: number } | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    let last = "";
    const collector = new PartCollector();
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return onError("Camera not available here. Paste the code instead.");
      const jsQR = (await import("jsqr")).default;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch {
        return onError("Couldn't open the camera. Allow camera access, or paste the code instead.");
      }
      const v = videoRef.current;
      if (cancelled || !v) return stream.getTracks().forEach((t) => t.stop());
      v.srcObject = stream;
      v.setAttribute("playsinline", "true");
      await v.play().catch(() => {});
      const tick = () => {
        if (cancelled) return;
        const c = canvasRef.current;
        if (c && v.readyState >= 2 && v.videoWidth) {
          const w = Math.min(v.videoWidth, 800);
          const h = Math.round((v.videoHeight / v.videoWidth) * w);
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, w, h);
            const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
            if (found?.data && found.data !== last) {
              last = found.data;
              try {
                const text = collector.add(found.data);
                setProgress(collector.progress.total ? collector.progress : null);
                if (text) return onDone(text);
              } catch (e) {
                return onError((e as Error).message);
              }
            }
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDone, onError]);

  return (
    <div className="space-y-2">
      <video ref={videoRef} className="aspect-square w-full rounded-md bg-muted object-cover" muted />
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-center text-sm text-muted-foreground">
        {progress ? `Got ${progress.have} of ${progress.total} frames — keep holding steady…` : "Point the camera at the Vault's pairing QR"}
      </p>
    </div>
  );
}

export function VaultLinkDialog({ storeId, open, onOpenChange, onLinked }: { storeId: string; open: boolean; onOpenChange: (o: boolean) => void; onLinked: () => void }) {
  const preview = useServerFn(previewVaultPairing);
  const link = useServerFn(linkVaultPairing);
  const requestCode = useServerFn(requestWalletLinkVerification);
  const [mode, setMode] = useState<"scan" | "paste">("scan");
  const [raw, setRaw] = useState("");
  const [pairing, setPairing] = useState<string | null>(null);
  const [info, setInfo] = useState<Preview | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setPairing(null); setInfo(null); setSentTo(null); setCode(""); setError(null); setRaw(""); setMode("scan"); }
  }, [open]);

  async function check(text: string) {
    setError(null);
    setBusy(true);
    try {
      const p = await preview({ data: { storeId, pairing: text } });
      setPairing(text);
      setInfo(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const r = await requestCode({ data: { storeId } });
      setSentTo(r.sent_to);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!pairing) return;
    setBusy(true);
    setError(null);
    try {
      const r = await link({ data: { storeId, pairing, verificationCode: code } });
      toast.success(`Linked HME Vault: ${r.linked.map((c) => c.toUpperCase()).join(", ")}`);
      onLinked();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link HME Vault</DialogTitle>
          <DialogDescription>
            On your Vault, open the wallet and show its pairing QR. Vault only shares view-only keys — it can never spend from here.
          </DialogDescription>
        </DialogHeader>

        {!info && (
          <div className="space-y-3">
            {mode === "scan" && open ? (
              <MultiFrameScanner onDone={check} onError={(m) => { setError(m); setMode("paste"); }} />
            ) : (
              <Textarea rows={5} placeholder='Paste the Vault pairing code ({"hmvault":1,…})' value={raw} onChange={(e) => setRaw(e.target.value)} />
            )}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode(mode === "scan" ? "paste" : "scan")}>
                {mode === "scan" ? "Paste instead" : <><ScanLine className="mr-1 h-4 w-4" /> Scan instead</>}
              </Button>
              {mode === "paste" && (
                <Button size="sm" disabled={busy || !raw.trim()} onClick={() => check(raw)}>
                  {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Check
                </Button>
              )}
            </div>
          </div>
        )}

        {info && (
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Check these match your Vault (first sale address for each coin):</p>
              <ul className="space-y-2">
                {info.addresses.map((a) => (
                  <li key={a.chain}>
                    <div className="text-muted-foreground">{LABEL[a.chain] ?? a.chain}</div>
                    <code className="break-all text-xs">{a.address}</code>
                  </li>
                ))}
              </ul>
              {info.evmAddressOnly && (
                <p className="mt-3 text-xs text-muted-foreground">
                  ETH, Base, BSC and ZCU aren't linked yet: this Vault version shares only one address, and every sale needs a fresh one. Those stay as they are.
                </p>
              )}
            </div>
            {!sentTo ? (
              <Button className="w-full" disabled={busy} onClick={sendCode}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Email me a confirmation code
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">We sent a 6-digit code to {sentTo}.</p>
                <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                <Button className="w-full" disabled={busy || code.length !== 6} onClick={save}>
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />} Link Vault to this store
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

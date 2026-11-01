import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseFastCoinQr, type FastCoinQr } from "@/lib/fast-coin-qr";

export function FastCoinScanner({ open, onOpenChange, onResult }: {
  open: boolean; onOpenChange: (open: boolean) => void; onResult: (coin: FastCoinQr) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const result = useRef(onResult);
  result.current = onResult;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    setError(""); setReady(false);
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const decode = (await import("jsqr")).default;
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const v = video.current;
        if (cancelled || !v) { stream.getTracks().forEach((t) => t.stop()); return; }
        v.srcObject = stream;
        await v.play();
        if (cancelled) return;
        setReady(true);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        let lastScan = 0;
        function tick(time: number) {
          if (cancelled) return;
          if (ctx && v && v.readyState >= 2 && v.videoWidth && time - lastScan > 180) {
            lastScan = time;
            canvas.width = Math.min(v.videoWidth, 800);
            canvas.height = Math.round(v.videoHeight / v.videoWidth * canvas.width);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const found = decode(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            if (found?.data) {
              const coin = parseFastCoinQr(found.data);
              if (coin) { stream?.getTracks().forEach((t) => t.stop()); result.current(coin); return; }
              setError("That QR isn't a TEXITcoin public key or coin ID. Scan the public side of the coin.");
            }
          }
          frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Couldn't open the camera. Allow camera access, choose a QR photo, or enter the coin ID.");
      }
    }
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((t) => t.stop()); };
  }, [open]);

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    setReading(true); setError("");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Couldn't read that photo.");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const decode = (await import("jsqr")).default;
      const found = decode(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      const coin = found ? parseFastCoinQr(found.data) : null;
      if (!coin) throw new Error("No TEXITcoin public QR found. Choose a clear photo of the public side of the coin.");
      result.current(coin);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't read that photo."); }
    finally { URL.revokeObjectURL(url); setReading(false); if (upload.current) upload.current.value = ""; }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Scan Cold Storage Coin</DialogTitle><DialogDescription>Use the public QR on the coin — never the private key.</DialogDescription></DialogHeader>
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Coin QR camera" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Camera preview</div>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <input ref={upload} type="file" accept="image/*" className="hidden" aria-label="Coin QR photo" onChange={(e) => void readPhoto(e.target.files?.[0])} />
      <Button type="button" variant="outline" disabled={reading} onClick={() => upload.current?.click()}>{reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Choose QR photo</Button>
    </DialogContent>
  </Dialog>;
}
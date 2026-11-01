import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, ZoomIn, Flashlight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseFastCoinQr, type FastCoinQr } from "@/lib/fast-coin-qr";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CameraCapabilities = MediaTrackCapabilities & { focusMode?: string[]; zoom?: { min: number; max: number; step: number }; torch?: boolean };
type CameraSettings = MediaTrackSettings & { zoom?: number };

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
  const track = useRef<MediaStreamTrack | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [zoomRange, setZoomRange] = useState<CameraCapabilities["zoom"]>();
  const [zoom, setZoom] = useState(1);
  const [hasTorch, setHasTorch] = useState(false);
  const [torch, setTorch] = useState(false);

  async function cameraSetting(setting: Record<string, unknown>) {
    const current = track.current;
    if (!current) return false;
    try {
      await current.applyConstraints({ advanced: [setting as MediaTrackConstraintSet] });
      return true;
    } catch { return false; }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    setError(""); setReady(false); setZoomRange(undefined); setHasTorch(false); setTorch(false);
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const decode = (await import("jsqr")).default;
        if (cancelled) return;
        const constraints: MediaTrackConstraints = {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 1920 }, height: { ideal: 1080 },
        };
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
        const v = video.current;
        if (cancelled || !v) { stream.getTracks().forEach((t) => t.stop()); return; }
        const current = stream.getVideoTracks()[0];
        if (!current) throw new Error("Camera unavailable");
        track.current = current;
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (cancelled) return;
        setCameras(devices);
        // Phones can default to an ultra-wide lens. Prefer the normal rear lens.
        const mainRear = devices.find((d) => /back|rear|environment/i.test(d.label) && !/ultra|wide|tele|front/i.test(d.label));
        if (!deviceId && mainRear && current.getSettings().deviceId !== mainRear.deviceId) {
          stream.getTracks().forEach((t) => t.stop());
          setDeviceId(mainRear.deviceId);
          return;
        }
        const capabilities = (current.getCapabilities?.() ?? {}) as CameraCapabilities;
        if (capabilities.focusMode?.includes("continuous")) await cameraSetting({ focusMode: "continuous" });
        if (cancelled) return;
        setZoomRange(capabilities.zoom);
        setZoom((current.getSettings() as CameraSettings).zoom ?? capabilities.zoom?.min ?? 1);
        setHasTorch(Boolean(capabilities.torch));
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
            // Read the center at native resolution first: small coin QRs lose
            // their fine modules when the whole camera image is shrunk to 800px.
            const side = Math.min(v.videoWidth, v.videoHeight);
            canvas.width = side; canvas.height = side;
            ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, side, side);
            let found = decode(ctx.getImageData(0, 0, side, side).data, side, side, { inversionAttempts: "attemptBoth" });
            if (!found) {
              canvas.width = Math.min(v.videoWidth, 1280);
              canvas.height = Math.round(v.videoHeight / v.videoWidth * canvas.width);
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              found = decode(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
            }
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
    return () => { cancelled = true; cancelAnimationFrame(frame); stream?.getTracks().forEach((t) => t.stop()); track.current = null; };
  }, [open, deviceId]);

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
    <DialogContent className="w-[calc(100%-1rem)] max-w-4xl max-h-[95dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>Scan Cold Storage Coin</DialogTitle><DialogDescription>Use the public QR on the coin — never the private key.</DialogDescription></DialogHeader>
      <div className="relative h-[min(58dvh,620px)] min-h-56 overflow-hidden rounded-md bg-muted">
        <video ref={video} muted playsInline className="h-full w-full object-contain" aria-label="Coin QR camera" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Camera preview</div>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {cameras.length > 1 && <Select value={deviceId || track.current?.getSettings().deviceId} onValueChange={setDeviceId}>
          <SelectTrigger className="min-w-0 flex-1" aria-label="Camera"><SelectValue placeholder="Choose camera" /></SelectTrigger>
          <SelectContent>{cameras.map((camera, index) => <SelectItem key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</SelectItem>)}</SelectContent>
        </Select>}
        {hasTorch && <Button type="button" variant={torch ? "default" : "outline"} aria-label="Camera light" aria-pressed={torch} disabled={!ready} onClick={async () => { if (await cameraSetting({ torch: !torch })) setTorch(!torch); }}><Flashlight className="h-4 w-4" /></Button>}
      </div>
      {zoomRange && zoomRange.max > zoomRange.min && <div className="flex items-center gap-3">
        <ZoomIn className="h-5 w-5 shrink-0 text-muted-foreground" />
        <Slider aria-label="Camera zoom" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step || 0.1} value={[zoom]} disabled={!ready} onValueChange={([value]) => { if (value !== undefined) { setZoom(value); void cameraSetting({ zoom: value }); } }} />
        <output className="w-12 shrink-0 text-right text-sm tabular-nums">{zoom.toFixed(1)}×</output>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <input ref={upload} type="file" accept="image/*" className="hidden" aria-label="Coin QR photo" onChange={(e) => void readPhoto(e.target.files?.[0])} />
      <Button type="button" variant="outline" disabled={reading} onClick={() => upload.current?.click()}>{reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Choose QR photo</Button>
    </DialogContent>
  </Dialog>;
}
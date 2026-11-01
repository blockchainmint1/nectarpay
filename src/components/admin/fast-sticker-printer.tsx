import { useEffect, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FAST_LABEL_TEMPLATES, labelPlacements } from "@/lib/fast-sticker-labels";
import { createFastStickerPdf } from "@/lib/fast-sticker-pdf";

export function FastStickerPrinter({ merchant, onClose }: { merchant: { code: string; name: string; qr: string }; onClose: () => void }) {
  const [templateId, setTemplateId] = useState("5163");
  const [quantity, setQuantity] = useState(10);
  const [start, setStart] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const template = FAST_LABEL_TEMPLATES.find((t) => t.id === templateId) ?? FAST_LABEL_TEMPLATES[0];
  const capacity = template.columns * template.rows;
  let validation: string | null = null;
  try { labelPlacements(template, quantity, start, offsetX, offsetY); } catch (e) { validation = e instanceof Error ? e.message : "Check settings."; }
  useEffect(() => {
    setPdfUrl(null);
    setBusy(true);
    let cancelled = false;
    let url: string | null = null;
    if (validation) { setBusy(false); return; }
    const timer = setTimeout(() => {
      createFastStickerPdf({ ...merchant, template, quantity, startPosition: start, offsetX, offsetY }).then((bytes) => {
        if (cancelled) return;
        const buffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(buffer).set(bytes);
        url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
        setPdfUrl(url);
      }).catch(() => { if (!cancelled) toast.error("Could not create sticker PDF."); }).finally(() => { if (!cancelled) setBusy(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [merchant, template, quantity, start, offsetX, offsetY, validation]);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
      <DialogHeader><DialogTitle>Print stickers · {merchant.name}</DialogTitle><DialogDescription>Coin / merchant code: {merchant.code}</DialogDescription></DialogHeader>
      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="label-template">Avery label template</Label>
            <Select value={templateId} onValueChange={(id) => { setTemplateId(id); setStart(1); setQuantity(id === "5160" ? 30 : 10); }}><SelectTrigger id="label-template"><SelectValue /></SelectTrigger><SelectContent>{FAST_LABEL_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="sticker-quantity">Stickers</Label><Input id="sticker-quantity" type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></div><div className="space-y-2"><Label htmlFor="sticker-start">Start at label</Label><Input id="sticker-start" type="number" min={1} max={capacity} value={start} onChange={(e) => setStart(Number(e.target.value))} /></div></div>
          <Button variant="outline" className="w-full" onClick={() => { setStart(1); setQuantity(capacity); }}>Fill one sheet</Button>
          <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Printer alignment</summary><div className="mt-3 grid grid-cols-2 gap-3"><div><Label htmlFor="sticker-x">Right (mm)</Label><Input id="sticker-x" type="number" min={-5} max={5} step={0.5} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></div><div><Label htmlFor="sticker-y">Down (mm)</Label><Input id="sticker-y" type="number" min={-5} max={5} step={0.5} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></div></div></details>
          {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!pdfUrl || busy} onClick={() => { if (!pdfUrl) return; const a = document.createElement("a"); a.href = pdfUrl; a.download = `nectarpay-${merchant.code}-avery-${template.id}.pdf`; a.click(); }}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
            <Button variant="outline" disabled={!pdfUrl || busy} onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer"); }}><Printer className="mr-2 h-4 w-4" />Print stickers</Button>
          </div>
          <p className="text-xs text-muted-foreground">US Letter · Actual size / 100% · No “Fit to page”. Test on plain paper before using label stock.</p>
        </div>
        <div className="min-w-0">
          {busy ? <div className="flex h-96 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating PDF…</div> : pdfUrl ? <div className="space-y-2">
            <svg viewBox="0 0 612 792" role="img" aria-label="First page of merchant sticker sheet" className="mx-auto max-h-[520px] w-full border border-border bg-paper text-paper-ink">
              {labelPlacements(template, quantity, start, offsetX, offsetY).filter((p) => p.page === 0).map((p) => {
                const size = Math.min(p.height - 14, p.width * 0.45);
                const top = 792 - p.y - p.height;
                const x = p.x + 14 + size;
                const small = p.height < 100;
                return <g key={p.slot} fill="currentColor">
                  <image href={merchant.qr} x={p.x + 7} y={top + (p.height - size) / 2} width={size} height={size} />
                  <text x={x} y={top + (small ? 14 : 24)} fontFamily="Arial" fontWeight="bold" fontSize={small ? 10 : 17}>Pay with TSD</text>
                  <text x={x} y={top + (small ? 27 : 46)} fontFamily="Arial" fontSize={small ? 7 : 11} textLength={Math.min((merchant.name.length * (small ? 3.5 : 5.5)), p.x + p.width - 7 - x)} lengthAdjust="spacingAndGlyphs">{merchant.name}</text>
                  <text x={x} y={top + (small ? 44 : 78)} fontFamily="monospace" fontWeight="bold" fontSize={small ? 13 : 22}>{merchant.code}</text>
                  <text x={x} y={top + p.height - (small ? 8 : 15)} fontFamily="Arial" fontSize={small ? 5.5 : 8}>NectarPay · honest.money</text>
                </g>;
              })}
            </svg>
            <p className="text-center text-xs text-muted-foreground">Page 1 of {Math.ceil((start - 1 + quantity) / capacity)} · {quantity} stickers</p>
          </div> : <div className="flex h-96 items-center justify-center text-muted-foreground">PDF preview unavailable</div>}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
import { useEffect, useRef } from "react";
import type SignaturePad from "signature_pad";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FastSignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("signature_pad").then(({ default: SignaturePadClass }) => {
      const sheet = canvas.current;
      if (disposed || !sheet) return;
      const instance = new SignaturePadClass(sheet, { penColor: getComputedStyle(sheet).color, minWidth: 1.2, maxWidth: 2.8 });
      pad.current = instance;
      const resize = () => {
        const strokes = instance.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sheet.width = sheet.offsetWidth * ratio;
        sheet.height = sheet.offsetHeight * ratio;
        sheet.getContext("2d")?.scale(ratio, ratio);
        instance.clear();
        if (strokes.length) instance.fromData(strokes);
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(sheet);
      instance.addEventListener("endStroke", () => change.current(instance.isEmpty() ? "" : instance.toDataURL()));
    });
    return () => { disposed = true; observer?.disconnect(); pad.current?.off(); pad.current = null; };
  }, []);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium"><PenLine className="h-4 w-4 text-primary" /> Merchant signature *</span>
        <Button type="button" variant="ghost" size="icon" title="Clear signature" aria-label="Clear signature" onClick={() => { pad.current?.clear(); onChange(""); }} disabled={!value}><Eraser className="h-4 w-4" /></Button>
      </div>
      <div className="relative overflow-hidden rounded-md border border-border bg-paper">
        <canvas ref={canvas} aria-label="Merchant signature" className="block h-32 w-full touch-none text-ink" />
        {!value && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-soft">Sign here</span>}
        <div className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-ink-soft/30" />
      </div>
    </div>
  );
}
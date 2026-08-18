// Canvas-rendered, on-brand promo banners for a store's share link.
// Each banner embeds the live QR code for the /t/<slug> virtual terminal
// plus Buzzy, the Nectar.Pay bee. Rendered client-side, downloadable as PNG.

import buzzyAsset from "@/assets/buzzy-hero.png.asset.json";
import { qrToDataURL } from "@/lib/qr";

export type BannerId = "email" | "social" | "tent";

export interface BannerSpec {
  id: BannerId;
  name: string;
  size: string;
  blurb: string;
  width: number;
  height: number;
}

export const BANNERS: BannerSpec[] = [
  {
    id: "email",
    name: "Banner 1 — Email signature",
    size: "1200 × 320",
    blurb: "Wide strip for email signatures, newsletters and site footers.",
    width: 1200,
    height: 320,
  },
  {
    id: "social",
    name: "Banner 2 — Social square",
    size: "1080 × 1080",
    blurb: "Instagram / Facebook post with a big, scannable QR.",
    width: 1080,
    height: 1080,
  },
  {
    id: "tent",
    name: "Banner 3 — Counter card",
    size: "900 × 1200",
    blurb: "Print it, fold it, stand it on the counter or tape it to the door.",
    width: 900,
    height: 1200,
  },
];

const HONEY = "#f5c542";
const HONEY_DEEP = "#e0a91b";
const INK = "#0b0f1c";
const INK_SOFT = "#141a2c";
const CREAM = "#fdf8ec";

let buzzyPromise: Promise<HTMLImageElement | null> | null = null;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadBuzzy(): Promise<HTMLImageElement | null> {
  if (!buzzyPromise) buzzyPromise = loadImage(buzzyAsset.url);
  return buzzyPromise;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Honeycomb texture, very subtle, drawn over the dark background. */
function hexPattern(ctx: CanvasRenderingContext2D, w: number, h: number, size: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(245,197,66,0.09)";
  ctx.lineWidth = 2;
  const dx = size * 1.5;
  const dy = Math.sqrt(3) * size;
  for (let col = -1; col * dx < w + size; col++) {
    for (let row = -1; row * dy < h + size; row++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 ? dy / 2 : 0);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = cx + size * Math.cos(a);
        const py = cy + size * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight = "800",
  family = "system-ui, -apple-system, 'Segoe UI', sans-serif",
): number {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > 12) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function qrTile(
  ctx: CanvasRenderingContext2D,
  qr: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const pad = size * 0.07;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.02;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, size, size, size * 0.09);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qr, x + pad, y + pad, size - pad * 2, size - pad * 2);
}

export interface BannerInput {
  id: BannerId;
  title: string;
  subtitle: string;
  url: string;
  donation: boolean;
}

export async function renderBanner(input: BannerInput): Promise<HTMLCanvasElement> {
  const spec = BANNERS.find((b) => b.id === input.id) ?? BANNERS[0]!;
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const [qr, buzzy] = await Promise.all([
    qrToDataURL(input.url, { margin: 0, width: 900, color: { dark: INK, light: "#ffffff" } }).then(
      loadImage,
    ),
    loadBuzzy(),
  ]);

  const verb = input.donation ? "Donate with crypto" : "Pay with crypto";
  const kicker = input.donation ? "SCAN TO DONATE" : "SCAN TO PAY";

  if (input.id === "email") drawEmail(ctx, spec, input, qr, buzzy, verb);
  else if (input.id === "social") drawSocial(ctx, spec, input, qr, buzzy, kicker);
  else drawTent(ctx, spec, input, qr, buzzy, kicker);

  return canvas;
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, hex: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, INK);
  g.addColorStop(1, INK_SOFT);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  hexPattern(ctx, w, h, hex);
  ctx.strokeStyle = HONEY;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
}

function drawBuzzy(
  ctx: CanvasRenderingContext2D,
  buzzy: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
) {
  if (!buzzy) return;
  ctx.drawImage(buzzy, x, y, size, size);
}

function drawEmail(
  ctx: CanvasRenderingContext2D,
  spec: BannerSpec,
  input: BannerInput,
  qr: HTMLImageElement | null,
  buzzy: HTMLImageElement | null,
  verb: string,
) {
  const { width: w, height: h } = spec;
  backdrop(ctx, w, h, 26);

  drawBuzzy(ctx, buzzy, 12, h - 300, 300);

  const textX = 320;
  const maxText = w - textX - 300;

  ctx.fillStyle = HONEY;
  ctx.font = "700 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(verb.toUpperCase(), textX, 86);

  ctx.fillStyle = CREAM;
  const titlePx = fitText(ctx, input.title, maxText, 54);
  ctx.font = `800 ${titlePx}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(input.title, textX, 146);

  ctx.fillStyle = "rgba(253,248,236,0.72)";
  ctx.font = "400 24px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const lines = wrapLines(ctx, input.subtitle, maxText).slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, textX, 190 + i * 32));

  ctx.fillStyle = HONEY_DEEP;
  ctx.font = "600 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  const shortUrl = input.url.replace(/^https?:\/\//, "");
  ctx.fillText(shortUrl, textX, h - 46);

  if (qr) qrTile(ctx, qr, w - 260, (h - 220) / 2, 220);
}

function drawSocial(
  ctx: CanvasRenderingContext2D,
  spec: BannerSpec,
  input: BannerInput,
  qr: HTMLImageElement | null,
  buzzy: HTMLImageElement | null,
  kicker: string,
) {
  const { width: w, height: h } = spec;
  backdrop(ctx, w, h, 42);

  ctx.textAlign = "center";
  ctx.fillStyle = HONEY;
  ctx.font = "700 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(kicker, w / 2, 118);

  ctx.fillStyle = CREAM;
  const titlePx = fitText(ctx, input.title, w - 160, 76);
  ctx.font = `800 ${titlePx}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(input.title, w / 2, 200);

  ctx.fillStyle = "rgba(253,248,236,0.72)";
  ctx.font = "400 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
  wrapLines(ctx, input.subtitle, w - 220)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, w / 2, 252 + i * 40));

  if (qr) qrTile(ctx, qr, (w - 440) / 2, 340, 440);

  drawBuzzy(ctx, buzzy, w - 330, h - 380, 340);

  ctx.textAlign = "left";
  ctx.fillStyle = HONEY_DEEP;
  ctx.font = "600 28px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(input.url.replace(/^https?:\/\//, ""), 70, h - 190);

  ctx.fillStyle = CREAM;
  ctx.font = "800 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Nectar.Pay", 70, h - 120);
  ctx.fillStyle = "rgba(253,248,236,0.6)";
  ctx.font = "400 24px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Bitcoin · Stablecoins · TSD", 70, h - 82);
  ctx.textAlign = "left";
}

function drawTent(
  ctx: CanvasRenderingContext2D,
  spec: BannerSpec,
  input: BannerInput,
  qr: HTMLImageElement | null,
  buzzy: HTMLImageElement | null,
  kicker: string,
) {
  const { width: w, height: h } = spec;
  // Light "printable" variant: cream paper, honey banding.
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.5;
  hexPattern(ctx, w, h, 34);
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, 180);
  ctx.strokeStyle = HONEY;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  ctx.textAlign = "center";
  ctx.fillStyle = HONEY;
  ctx.font = "800 46px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("WE ACCEPT CRYPTO", w / 2, 112);

  ctx.fillStyle = INK;
  const titlePx = fitText(ctx, input.title, w - 140, 60);
  ctx.font = `800 ${titlePx}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(input.title, w / 2, 268);

  ctx.fillStyle = "rgba(11,15,28,0.65)";
  ctx.font = "400 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
  wrapLines(ctx, input.subtitle, w - 180)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, w / 2, 316 + i * 38));

  if (qr) qrTile(ctx, qr, (w - 480) / 2, 410, 480);

  ctx.fillStyle = INK;
  ctx.font = "800 44px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(kicker.replace("SCAN TO ", "Scan to "), w / 2, 960);

  ctx.fillStyle = HONEY_DEEP;
  ctx.font = "600 26px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(input.url.replace(/^https?:\/\//, ""), w / 2, 1002);

  drawBuzzy(ctx, buzzy, 28, h - 300, 300);

  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = "800 38px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Nectar.Pay", w - 50, h - 90);
  ctx.fillStyle = "rgba(11,15,28,0.6)";
  ctx.font = "400 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("Bitcoin · Stablecoins · Texas Stable Dollar", w - 50, h - 56);
  ctx.textAlign = "left";
}

export async function bannerDataUrl(input: BannerInput): Promise<string> {
  const canvas = await renderBanner(input);
  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

import frontAsset from "@/assets/nectarpay-flyer-front.pdf.asset.json";
import backAsset from "@/assets/nectarpay-flyer-back.pdf.asset.json";

export type FlyerVariant = "front" | "back";

export const FLYER_VARIANTS: Array<{
  id: FlyerVariant;
  label: string;
  description: string;
  url: string;
}> = [
  {
    id: "front",
    label: "Sweetest Way (Front)",
    description: "Customer-facing intro — six reasons businesses choose NectarPay.",
    url: frontAsset.url,
  },
  {
    id: "back",
    label: "Own Your Hardware (Back)",
    description: "Pricing, POS hardware, and the Business Boost program.",
    url: backAsset.url,
  },
];

// Approximate QR box on each 612x792pt letter flyer (from bottom-left origin).
// Front: large QR bottom-right, above the nectar-pay.com/start button.
// Back:  small QR to the right of the "Get Started Today" CTA.
const QR_POSITIONS: Record<FlyerVariant, { x: number; y: number; size: number; urlX: number; urlY: number; urlSize: number }> = {
  front: { x: 438, y: 40, size: 128, urlX: 438, urlY: 27, urlSize: 8 },
  back: { x: 512, y: 30, size: 66, urlX: 380, urlY: 20, urlSize: 7 },
};

export async function generateAffiliateFlyer(opts: {
  variant: FlyerVariant;
  trackingUrl: string;
  affiliateCode: string;
}): Promise<Uint8Array> {
  const variant = FLYER_VARIANTS.find((v) => v.id === opts.variant)!;

  const [pdfBytes, qrPngDataUrl] = await Promise.all([
    fetch(variant.url).then((r) => {
      if (!r.ok) throw new Error(`Failed to load flyer (${r.status})`);
      return r.arrayBuffer();
    }),
    QRCode.toDataURL(opts.trackingUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 512,
      color: { dark: "#0B1220", light: "#FFFFFF" },
    }),
  ]);

  const pdf = await PDFDocument.load(pdfBytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Courier);

  const qrPng = await pdf.embedPng(qrPngDataUrl);
  const pos = QR_POSITIONS[opts.variant];

  // White backing so the QR replaces the placeholder cleanly.
  page.drawRectangle({
    x: pos.x - 4,
    y: pos.y - 4,
    width: pos.size + 8,
    height: pos.size + 8,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrPng, { x: pos.x, y: pos.y, width: pos.size, height: pos.size });

  // Print the tracking URL in small type near the QR.
  const short = opts.trackingUrl.replace(/^https?:\/\//, "");
  page.drawRectangle({
    x: pos.urlX - 2,
    y: pos.urlY - 2,
    width: font.widthOfTextAtSize(short, pos.urlSize) + 4,
    height: pos.urlSize + 4,
    color: rgb(1, 1, 1),
  });
  page.drawText(short, {
    x: pos.urlX,
    y: pos.urlY,
    size: pos.urlSize,
    font,
    color: rgb(0.04, 0.07, 0.13),
  });

  const bytes = await pdf.save();
  // Filename hint for callers
  (bytes as unknown as { filename?: string }).filename = `nectarpay-flyer-${opts.variant}-${opts.affiliateCode}.pdf`;
  return bytes;
}

export function downloadBlob(bytes: Uint8Array, filename: string) {
  // pdf-lib returns a Uint8Array; wrap in a fresh ArrayBuffer for Blob typing.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const blob = new Blob([buf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

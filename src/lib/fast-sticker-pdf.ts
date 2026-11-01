import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { labelPlacements, type LabelTemplate } from "./fast-sticker-labels";
import { stickerPath } from "./fast-enroll";

function printable(text: string, font: PDFFont) {
  return Array.from(text).map((char) => { try { font.encodeText(char); return char; } catch { return "-"; } }).join("").replace(/[\r\n\t]/g, " ");
}

export async function createFastStickerPdf(input: { name: string; code: string; qr: string; template: LabelTemplate; quantity: number; startPosition: number; offsetX?: number; offsetY?: number }) {
  if (!/^[A-Za-z0-9]{6}$/.test(input.code)) throw new Error("Invalid merchant sticker code.");
  const placements = labelPlacements(input.template, input.quantity, input.startPosition, input.offsetX, input.offsetY);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`NectarPay Fast Start stickers · ${input.code} · Avery ${input.template.id}`);
  const [regular, bold, mono, qr] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.CourierBold), pdf.embedPng(input.qr)]);
  for (const p of placements) {
    while (pdf.getPageCount() <= p.page) pdf.addPage([612, 792]);
    const page = pdf.getPage(p.page);
    const inset = 7;
    const qrSize = Math.min(p.height - inset * 2, p.width * 0.45);
    page.drawImage(qr, { x: p.x + inset, y: p.y + (p.height - qrSize) / 2, width: qrSize, height: qrSize });
    const x = p.x + inset + qrSize + 7;
    const width = p.x + p.width - inset - x;
    const small = p.height < 100;
    let y = p.y + p.height - (small ? 14 : 24);
    const draw = (text: string, font: PDFFont, desired: number) => {
      const safe = printable(text, font);
      const size = Math.min(desired, width / Math.max(1, font.widthOfTextAtSize(safe, 1)));
      page.drawText(safe, { x, y, font, size });
    };
    draw("Pay with TSD", bold, small ? 10 : 17);
    y -= small ? 13 : 22;
    const words = printable(input.name, regular).split(/\s+/);
    const nameSize = small ? 7 : 11;
    const lines: string[] = [""];
    for (const word of words) {
      const current = lines[lines.length - 1];
      if (current && regular.widthOfTextAtSize(`${current} ${word}`, nameSize) > width && lines.length < 2) lines.push(word);
      else lines[lines.length - 1] = `${current} ${word}`.trim();
    }
    for (const line of lines) { draw(line, regular, nameSize); y -= small ? 9 : 14; }
    y -= small ? 4 : 9;
    draw(input.code, mono, small ? 13 : 22);
    y = p.y + (small ? 8 : 15);
    draw("NectarPay · honest.money", regular, small ? 5.5 : 8);
  }
  pdf.setSubject(`Merchant payment URL: https://app.nectar-pay.com${stickerPath(input.code)}. Print US Letter at 100%, actual size.`);
  return pdf.save();
}
// Shrinks a signature for the thermal printer: crops away blank space around
// the ink and scales it to a short strip so the receipt stays compact.
const MAX_W = 240;
const MAX_H = 64;

export async function compactSignature(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const src = document.createElement("canvas");
  src.width = img.naturalWidth; src.height = img.naturalHeight;
  const sctx = src.getContext("2d")!;
  sctx.fillStyle = "#fff"; sctx.fillRect(0, 0, src.width, src.height);
  sctx.drawImage(img, 0, 0);
  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i] + data[i + 1] + data[i + 2] < 600) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = width - 1; y1 = height - 1; }
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const scale = Math.min(MAX_W / cw, MAX_H / ch, 1);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cw * scale)); out.height = Math.max(1, Math.round(ch * scale));
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#fff"; octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return out.toDataURL("image/png").split(",")[1];
}

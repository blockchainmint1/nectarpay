import { describe, expect, it } from "vitest";
import {
  MAX_SIGNATURE_CHARS,
  base64FromBytes,
  bytesFromBase64,
  hasStoredSignature,
  parseSignatureDataUrl,
  signatureFileName,
  signatureObjectPath,
} from "./sale-signature";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
const pngUrl = `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const jpegUrl = `data:image/jpeg;base64,${Buffer.from(JPEG).toString("base64")}`;

describe("captured customer signatures", () => {
  it("accepts a genuine PNG straight off the signing pad", () => {
    const parsed = parseSignatureDataUrl(pngUrl);
    expect(parsed?.mime).toBe("image/png");
    expect(Array.from(parsed?.bytes ?? [])).toEqual(Array.from(PNG));
  });
  it("accepts a genuine JPEG", () => {
    expect(parseSignatureDataUrl(jpegUrl)?.mime).toBe("image/jpeg");
  });
  it("refuses a data URL that claims to be a PNG but is not one", () => {
    const fake = `data:image/png;base64,${Buffer.from("<svg onload='alert(1)'>").toString("base64")}`;
    expect(parseSignatureDataUrl(fake)).toBeNull();
  });
  it("refuses anything that is not an image", () => {
    expect(parseSignatureDataUrl("data:text/html;base64,PGI+eGI+L2I+")).toBeNull();
    expect(parseSignatureDataUrl("not a data url")).toBeNull();
    expect(parseSignatureDataUrl("")).toBeNull();
  });
  it("refuses an oversized signature", () => {
    expect(parseSignatureDataUrl(`data:image/png;base64,${"A".repeat(MAX_SIGNATURE_CHARS)}`)).toBeNull();
  });
  it("refuses a truncated base64 payload", () => {
    expect(parseSignatureDataUrl("data:image/png;base64,!!!!")).toBeNull();
  });
  it("keeps one image file per sale", () => {
    expect(signatureObjectPath("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111.png");
    expect(signatureObjectPath("abc", "image/jpeg")).toBe("abc.jpg");
    expect(signatureFileName("11111111-1111-4111-8111-111111111111")).toBe("signature-11111111.png");
  });
  it("round-trips bytes through base64 without browser or Node helpers", () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255, 42, 128, 64]);
    expect(Array.from(bytesFromBase64(base64FromBytes(bytes)) ?? [])).toEqual(Array.from(bytes));
  });
  it("copies a decoded signature into a buffer of exactly its own size", () => {
    const decoded = bytesFromBase64(base64FromBytes(new Uint8Array([1, 2, 3, 4])));
    expect(decoded).not.toBeNull();
    expect(toArrayBuffer(decoded!).byteLength).toBe(4);
  });
  it("counts a sale as signed whether the image is a file or an inline copy", () => {
    expect(hasStoredSignature({ id: "x", signature_path: "x.png" })).toBe(true);
    expect(hasStoredSignature({ id: "x", signature_data_url: pngUrl })).toBe(true);
    expect(hasStoredSignature({ id: "x" })).toBe(false);
  });
});

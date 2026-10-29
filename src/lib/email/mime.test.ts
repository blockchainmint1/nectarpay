import { describe, expect, it } from "vitest";
import { rawMimeEmail } from "./mime";
import { sesEmailBody } from "./ses.server";

const base = {
  from: "NectarPay <noreply@nectar-pay.com>",
  to: "buyer@example.com",
  subject: "Your receipt",
  html: "<p>Paid</p>",
  text: "Paid",
};
const signature = { cid: "sale-signature", filename: "signature.png", contentType: "image/png", base64: "iVBORw0KGgo=" };

/** Body of the first MIME part whose header block contains `marker`. */
function bodyOf(mime: string, marker: string): string {
  const start = mime.indexOf(marker);
  if (start < 0) throw new Error(`missing part: ${marker}`);
  const headEnd = mime.indexOf("\r\n\r\n", start);
  const next = mime.indexOf("\r\n--", headEnd + 4);
  return mime.slice(headEnd + 4, next < 0 ? undefined : next).replace(/\r\n/g, "");
}

describe("receipt email with an inline signature", () => {
  it("keeps the plain text and HTML bodies readable", () => {
    const mime = rawMimeEmail({ ...base, inline: [signature] }, "bnd");
    expect(mime).toContain('Content-Type: multipart/related; boundary="bnd"');
    expect(Buffer.from(bodyOf(mime, "text/plain"), "base64").toString("utf8")).toBe("Paid");
    expect(Buffer.from(bodyOf(mime, "text/html"), "base64").toString("utf8")).toBe("<p>Paid</p>");
  });
  it("carries the signature under the content id the HTML points at", () => {
    const mime = rawMimeEmail({ ...base, inline: [signature] }, "bnd");
    expect(mime).toContain("Content-ID: <sale-signature>");
    expect(bodyOf(mime, "Content-ID: <sale-signature>")).toBe("iVBORw0KGgo=");
    expect(mime).toContain('Content-Disposition: inline; filename="signature.png"');
  });
  it("refuses a recipient that smuggles an extra header", () => {
    expect(() => rawMimeEmail({ ...base, to: "buyer@example.com\r\nBcc: victim@example.com" }, "bnd")).toThrow();
  });
  it("keeps a line break out of the subject line", () => {
    const mime = rawMimeEmail({ ...base, subject: "Receipt\r\nBcc: victim@example.com", inline: [signature] }, "bnd");
    expect(mime).toContain("Subject: Receipt Bcc: victim@example.com");
    expect(mime.split("\r\n").some((line) => line.startsWith("Bcc:"))).toBe(false);
  });
  it("sends a raw message only when an image is attached", () => {
    const simple = sesEmailBody({ to: base.to, subject: base.subject, html: base.html, text: base.text });
    expect((simple.Content as { Simple?: unknown }).Simple).toBeDefined();
    const withImage = sesEmailBody({ to: base.to, subject: base.subject, html: base.html, text: base.text, inline: [signature] });
    const raw = (withImage.Content as { Raw?: { Data: string } }).Raw;
    expect(raw?.Data).toBeTruthy();
    expect(Buffer.from(raw?.Data ?? "", "base64").toString("utf8")).toContain("Content-ID: <sale-signature>");
  });
});

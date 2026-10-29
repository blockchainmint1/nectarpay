// Raw MIME builder for emails that carry an inline image (SES's simple body
// cannot). Kept pure and boundary-injectable so the output is testable.

import { base64FromBytes } from "@/lib/sale-signature";

export interface InlineImage {
  /** Content-ID referenced from the HTML as `cid:<cid>`. */
  cid: string;
  filename: string;
  contentType: string;
  /** Base64 payload, no data URL prefix. */
  base64: string;
}

export interface RawEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  inline?: InlineImage[];
}

const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CID = /^[A-Za-z0-9._-]{1,64}$/;
const BOUNDARY = /^[A-Za-z0-9._-]{1,70}$/;

/** Header values must never carry line breaks: that is how headers are injected. */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

/** base64 transfer encoding, wrapped at 76 characters as MIME requires. */
function encodedPart(text: string): string {
  const b64 = base64FromBytes(new TextEncoder().encode(text));
  return b64.replace(/(.{76})/g, "$1\r\n");
}

function inlinePart(image: InlineImage): string[] {
  if (!CID.test(image.cid)) throw new Error("Inline image id is invalid");
  const filename = headerSafe(image.filename).replace(/"/g, "");
  const contentType = headerSafe(image.contentType).replace(/[^A-Za-z0-9./+-]/g, "");
  return [
    `Content-Type: ${contentType}; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-ID: <${image.cid}>`,
    `Content-Disposition: inline; filename="${filename}"`,
    "",
    image.base64.replace(/(.{76})/g, "$1\r\n"),
  ];
}

/**
 * multipart/related wrapping a multipart/alternative (plain + HTML) and one
 * part per inline image. Throws on a recipient that is not a single address.
 */
export function rawMimeEmail(email: RawEmail, boundary: string): string {
  const to = email.to.trim();
  if (!ADDRESS.test(to)) throw new Error("Email recipient is invalid");
  if (!BOUNDARY.test(boundary)) throw new Error("MIME boundary is invalid");
  const alternative = `${boundary}_alt`;

  const message: string[] = [
    `From: ${headerSafe(email.from)}`,
    `To: ${to}`,
    ...(email.replyTo ? [`Reply-To: ${headerSafe(email.replyTo)}`] : []),
    `Subject: ${headerSafe(email.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="' + alternative + '"',
    "",
    `--${alternative}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodedPart(email.text),
    `--${alternative}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodedPart(email.html),
    `--${alternative}--`,
  ];

  for (const image of email.inline ?? []) message.push(...["", `--${boundary}`, ...inlinePart(image)]);
  message.push("", `--${boundary}--`, "");
  return message.join("\r\n");
}

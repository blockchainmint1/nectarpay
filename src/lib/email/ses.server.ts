import { AwsClient } from "aws4fetch";
import { getEmailUnsubscribe } from "@lovable.dev/email-js";
import { base64FromBytes } from "@/lib/sale-signature";
import { rawMimeEmail, type InlineImage } from "./mime";

const SENDER = "NectarPay <noreply@nectar-pay.com>";

export interface SesEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Images embedded in the HTML through `cid:<cid>`; forces a raw MIME send. */
  inline?: InlineImage[];
}

export class SesSendError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly requestId: string | null) {
    super(`SES rejected the email (${status}, ${code}); request ${requestId ?? "unavailable"}`);
  }
}

export function sesEmailBody(email: SesEmail) {
  const addressing = {
    FromEmailAddress: SENDER,
    Destination: { ToAddresses: [email.to] },
    ...(email.replyTo ? { ReplyToAddresses: [email.replyTo] } : {}),
  };
  if (email.inline?.length) {
    const mime = rawMimeEmail({ ...email, from: SENDER, inline: email.inline }, crypto.randomUUID());
    return { ...addressing, Content: { Raw: { Data: base64FromBytes(new TextEncoder().encode(mime)) } } };
  }
  return {
    ...addressing,
    Content: { Simple: {
      Subject: { Data: email.subject, Charset: "UTF-8" },
      Body: { Html: { Data: email.html, Charset: "UTF-8" }, Text: { Data: email.text, Charset: "UTF-8" } },
    } },
  };
}

/** Single-recipient HTTPS transport; credentials never leave server-side signing. */
export async function sendSesEmail(email: SesEmail): Promise<{ messageId: string }> {
  const accessKeyId = process.env["AWS_SES_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SES_SECRET_ACCESS_KEY"];
  const region = process.env["AWS_SES_REGION"];
  if (!accessKeyId || !secretAccessKey || !region) throw new Error("SES email sending is not configured");
  if (!/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region)) throw new Error("SES region is invalid");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: suppressed, error: suppressionError } = await supabaseAdmin.from("suppressed_emails").select("email").eq("email", email.to.trim().toLowerCase()).maybeSingle();
  if (suppressionError) throw new Error("Email opt-out status could not be checked");
  if (suppressed) throw new SesSendError(409, "recipient_suppressed", null);
  const managedKey = process.env["LOVABLE_API_KEY"];
  if (!managedKey) throw new Error("Email opt-out verification is unavailable");
  const subscription = await getEmailUnsubscribe({ recipient: email.to, domain: "notify.nectar-pay.com" }, { apiKey: managedKey });
  if (!subscription.subscribed) throw new SesSendError(409, "recipient_suppressed", null);
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "ses", retries: 0 });
  const response = await client.fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sesEmailBody(email)),
  });
  const raw = await response.text();
  let body: { MessageId?: string; __type?: string; code?: string } = {};
  try { body = JSON.parse(raw); } catch { /* Never include a provider response that might contain recipient data. */ }
  if (!response.ok) throw new SesSendError(response.status, body.__type ?? body.code ?? "send_rejected", response.headers.get("x-amzn-requestid"));
  if (!body.MessageId) throw new Error("SES did not return an email acceptance ID");
  return { messageId: body.MessageId };
}
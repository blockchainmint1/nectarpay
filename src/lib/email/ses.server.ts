import { AwsClient } from "aws4fetch";

export interface SesEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export class SesSendError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly requestId: string | null) {
    super(`SES rejected the email (${status}, ${code}); request ${requestId ?? "unavailable"}`);
  }
}

export function sesEmailBody(email: SesEmail) {
  return {
    FromEmailAddress: "NectarPay <noreply@nectar-pay.com>",
    Destination: { ToAddresses: [email.to] },
    ...(email.replyTo ? { ReplyToAddresses: [email.replyTo] } : {}),
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
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "ses", retries: 0 });
  const response = await client.fetch(`https://email.${region}.amazonaws.com/v2/email/outbound-emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sesEmailBody(email)),
  });
  const body = await response.json() as { MessageId?: string; __type?: string; code?: string };
  if (!response.ok) throw new SesSendError(response.status, body.__type ?? body.code ?? "send_rejected", response.headers.get("x-amzn-requestid"));
  if (!body.MessageId) throw new Error("SES did not return an email acceptance ID");
  return { messageId: body.MessageId };
}
// Pure: the welcome email a /fast merchant gets once their sticker is live.
const APP = "https://app.nectar-pay.com";

export interface WelcomeInput {
  businessName: string;
  contactName: string;
  coinId: string;
  email: string;
  telegramLink: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function stickerUrl(coinId: string) {
  return `${APP}/s/${encodeURIComponent(coinId)}`;
}

export function signupUrl(email: string) {
  return `${APP}/signup?email=${encodeURIComponent(email)}`;
}

export function buildWelcomeEmail(i: WelcomeInput) {
  const sticker = stickerUrl(i.coinId);
  const signup = signupUrl(i.email);
  const first = i.contactName.split(/\s+/)[0] || "there";
  const subject = `${i.businessName} is live on NectarPay`;
  const text = [
    `Hi ${first},`,
    `${i.businessName} can take TSD payments right now. Your sticker code is ${i.coinId} (capital letters matter).`,
    `Your payment page: ${sticker}`,
    `We'll email this address every time a sale is paid.`,
    i.telegramLink ? `Get instant Telegram alerts too: ${i.telegramLink} (link works for 14 days)` : "",
    `Finish your account setup (same email address): ${signup}`,
    `Once your login exists, our team confirms you and hands the store over to you.`,
  ].filter(Boolean).join("\n\n");

  const btn = (href: string, label: string, primary = true) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:6px 0;padding:14px 22px;border-radius:8px;background:${primary ? "#F6A21E" : "#0D1B33"};color:${primary ? "#0D1B33" : "#ffffff"};font-size:15px;font-weight:800;text-decoration:none;">${esc(label)}</a>`;
  const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#4B5563;">${s}</p>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2B3242;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #E7E1D2;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0D1B33;padding:24px 32px;border-bottom:4px solid #F6A21E;"><div style="font-size:22px;font-weight:900;color:#ffffff;">Nectar<span style="color:#F6A21E;">Pay</span></div></td></tr>
<tr><td style="padding:32px;">
<div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#E8880C;">YOU'RE OPEN FOR BUSINESS</div>
<h1 style="margin:8px 0 18px;font-size:26px;color:#0D1B33;">${esc(i.businessName)} is live</h1>
${p(`Hi ${esc(first)}, your Cold Storage Coin is now your NectarPay merchant code. Customers scan your sticker and pay in TSD straight to your coin.`)}
<div style="margin:18px 0;padding:16px;border-radius:10px;background:#FAF8F3;text-align:center;"><div style="font-size:12px;color:#6A7182;">Sticker code (capitals matter)</div><div style="font-size:30px;font-weight:900;letter-spacing:2px;color:#0D1B33;">${esc(i.coinId)}</div></div>
<div style="text-align:center;">${btn(sticker, "Open my payment page")}</div>
${p("We'll email you here every time a sale is paid.")}
${i.telegramLink ? `${p("Want an instant ping on your phone too? Tap below to get sale alerts in Telegram (link works for 14 days).")}<div style="text-align:center;">${btn(i.telegramLink, "Get Telegram alerts", false)}</div>` : ""}
<h2 style="margin:26px 0 10px;font-size:18px;color:#0D1B33;">Finish your account setup</h2>
${p("Create your NectarPay login with this same email address. Once it exists, our team confirms you and hands the store over so you can see sales, reports and settings.")}
<div style="text-align:center;">${btn(signup, "Create my login")}</div>
</td></tr>
<tr><td style="padding:20px 28px;background:#FAF8F3;border-top:1px solid #E7E1D2;text-align:center;font-size:12px;color:#6A7182;">Part of the <a href="https://honest.money" style="color:#B96A00;">honest.money ecosystem</a> · <a href="${APP}/terms" style="color:#6A7182;">Terms</a> · <a href="${APP}/privacy" style="color:#6A7182;">Privacy</a> · <a href="${APP}/manifesto" style="color:#6A7182;">Manifesto</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

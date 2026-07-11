// Fire-and-forget signed POST to mineTXC awarding hash power for a
// referred signup. HMAC-SHA256 over the raw JSON body using
// MINETXC_AWARD_SECRET; mineTXC verifies with the same secret.
//
// Failures are swallowed on purpose — a mineTXC outage must never break
// a Nectar-Pay signup. mineTXC handles idempotency on its side by keying
// on referred_user_id.

import { createHmac } from "crypto";

type AwardPayload = {
  affiliate_id: string;
  referred_user_id: string;
  event: "signup";
  occurred_at: string;
};

export async function notifyMineTxcSignup(payload: AwardPayload): Promise<void> {
  const secret = process.env.MINETXC_AWARD_SECRET;
  const url = process.env.MINETXC_AWARD_URL;
  if (!secret || !url) {
    console.warn("[minetxc-award] MINETXC_AWARD_SECRET or MINETXC_AWARD_URL not set — skipping.");
    return;
  }

  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nectar-Signature": signature,
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[minetxc-award] non-OK ${res.status}: ${text.slice(0, 500)}`);
    }
  } catch (e) {
    console.error("[minetxc-award] request failed", e);
  }
}

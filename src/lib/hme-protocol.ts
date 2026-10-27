import { z } from "zod";

export const HME_SITE = "nectarpay";
export const hmeTicketSchema = z.object({
  iss: z.literal("honest.money"),
  site: z.literal(HME_SITE),
  minerId: z.string().uuid(),
  email: z.string().email().max(254),
  exp: z.number().int(),
  nonce: z.string().min(1).max(200),
});

export async function verifyHmeTicket(token: string, secret: string, now = Date.now()) {
  if (token.length > 4000) throw new Error("Invalid sign-in ticket");
  const parts = token.split(".");
  const [body, sig] = parts;
  if (parts.length !== 2 || !body || !sig || !/^[a-f0-9]{64}$/i.test(sig)) throw new Error("Invalid sign-in ticket");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(sig.match(/../g) ?? [], (hex) => parseInt(hex, 16));
  if (!await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(body))) throw new Error("Invalid sign-in ticket");
  let ticket;
  try {
    const decoded = atob(body.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(body.length / 4) * 4, "="));
    ticket = hmeTicketSchema.parse(JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0)))));
  } catch { throw new Error("Invalid sign-in ticket"); }
  if (ticket.exp * 1000 <= now || ticket.exp * 1000 > now + 120000) throw new Error("Sign-in ticket expired or invalid");
  return ticket;
}

export function hmeEventBody(email: string, ref: string | null, memberId?: string) {
  return { service: HME_SITE, event: "signup", ...(memberId ? { member_id: memberId } : { email }), ...(ref ? { ref } : {}) };
}
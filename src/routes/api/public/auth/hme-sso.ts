import { createFileRoute } from "@tanstack/react-router";

// Honest Money SSO (honest.money/api §1). Verifies the HMAC-signed ticket
// returned by honest.money/sso-login and issues a one-time magic-link hash
// the browser exchanges for a session. Same pattern as wallet-exchange.

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const fail = (error: string, status = 401) => Response.json({ error }, { status });

export const Route = createFileRoute("/api/public/auth/hme-sso")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.HME_HMAC_SECRET;
        if (!secret) return fail("Honest Money sign-in isn't set up yet", 503);

        const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
        const token = typeof body?.token === "string" ? body.token : "";
        const [enc, sig] = token.split(".");
        if (!enc || !sig || token.length > 4000) return fail("Invalid sign-in ticket", 400);

        const mac = await hmacHex(secret, enc);
        if (!safeEqual(mac, sig.toLowerCase())) return fail("Invalid sign-in ticket");

        let t: { email?: string; exp?: number; nonce?: string; minerId?: string };
        try {
          t = JSON.parse(b64urlDecode(enc));
        } catch {
          return fail("Invalid sign-in ticket", 400);
        }
        if (!t.exp || t.exp * 1000 < Date.now()) return fail("Sign-in ticket expired");
        if (!t.nonce || !t.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.email)) {
          return fail("Invalid sign-in ticket", 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Accept each nonce once.
        const { error: nonceErr } = await supabaseAdmin
          .from("hme_sso_nonces")
          .insert({ nonce: String(t.nonce).slice(0, 200) });
        if (nonceErr) return fail("Sign-in ticket already used");

        const email = t.email.toLowerCase();
        const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
        if (link.error || !link.data?.properties || !link.data.user) {
          console.error("[hme-sso] generateLink failed:", link.error);
          return fail("Could not sign you in", 500);
        }

        const { data: adminRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", link.data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        return Response.json({
          email,
          token_hash: link.data.properties.hashed_token,
          is_admin: Boolean(adminRole),
        });
      },
    },
  },
});

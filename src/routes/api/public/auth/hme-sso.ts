import { createFileRoute } from "@tanstack/react-router";

// Honest Money SSO (honest.money/api §1). Verifies the HMAC-signed ticket
// returned by honest.money/sso-login and issues a one-time magic-link hash
// the browser exchanges for a session. Same pattern as wallet-exchange.

const fail = (error: string, status = 401) => Response.json({ error }, { status });

export const Route = createFileRoute("/api/public/auth/hme-sso")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["HME_ECOSYSTEM"];
        if (!secret) return fail("Honest Money sign-in isn't set up yet", 503);

        const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
        const token = typeof body?.token === "string" ? body.token : "";
        const { verifyHmeTicket } = await import("@/lib/hme-protocol");
        let t;
        try { t = await verifyHmeTicket(token, secret); }
        catch { return fail("Invalid or expired Honest Money sign-in ticket"); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: identity, error: identityError } = await supabaseAdmin.from("hme_member_links")
          .select("user_id").eq("member_id", t.minerId).maybeSingle();
        if (identityError) return fail("Could not check your Honest Money account", 500);
        const bearer = request.headers.get("Authorization");
        let userId = identity?.user_id;
        if (!userId) {
          // A matching email is not ownership proof. First binding requires a verified local session.
          if (!bearer?.startsWith("Bearer ")) return fail("First sign in with your usual NectarPay method, then connect Honest Money from Account.", 409);
          const { data: caller, error: authError } = await supabaseAdmin.auth.getUser(bearer.slice(7));
          if (authError || !caller.user || caller.user.email?.toLowerCase() !== t.email.toLowerCase()) return fail("Sign in to the matching NectarPay account before connecting Honest Money", 409);
          const { data: existing } = await supabaseAdmin.from("hme_member_links").select("member_id").eq("user_id", caller.user.id).maybeSingle();
          if (existing && existing.member_id !== t.minerId) return fail("This account has a different Honest Money identity; review is required", 409);
          userId = caller.user.id;
        }
        const { data: local } = await supabaseAdmin.auth.admin.getUserById(userId);
        const { data: profile } = await supabaseAdmin.from("profiles").select("deactivated_at").eq("user_id", userId).maybeSingle();
        if (!local.user?.email || profile?.deactivated_at || (local.user.banned_until && Date.parse(local.user.banned_until) > Date.now())) return fail("This NectarPay account is unavailable", 403);
        const { error: nonceErr } = await supabaseAdmin.from("hme_sso_nonces").insert({ nonce: t.nonce });
        if (nonceErr) return fail("Sign-in ticket already used");
        if (!identity) {
          const { error: bindError } = await supabaseAdmin.from("hme_member_links").insert({ user_id: userId, member_id: t.minerId });
          if (bindError) return fail("This Honest Money identity is already connected; review is required", 409);
        }
        // Sign in by the permanent UUID's local account, never by the ticket's mutable email.
        const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: local.user.email });
        if (link.error || !link.data?.properties || !link.data.user) return fail("Could not sign you in", 500);

        const { data: adminRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", link.data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        return Response.json({
          token_hash: link.data.properties.hashed_token,
          is_admin: Boolean(adminRole),
        });
      },
    },
  },
});

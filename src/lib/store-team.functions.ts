// Store team access: owners invite people (accounting, managers) to a store
// with a limited access level. Everything here is owner-gated except
// invite preview/acceptance, which is scoped to a single-use token.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoreRole = "viewer" | "manager" | "admin";

export const ROLE_LABEL: Record<StoreRole, string> = {
  viewer: "View only",
  manager: "Manager",
  admin: "Full access",
};

export const ROLE_BLURB: Record<StoreRole, string> = {
  viewer: "Sees payments, transactions and reports. Can't change anything.",
  manager:
    "Everything view-only can do, plus create payment requests, run terminals and see wallet balances.",
  admin: "Everything a manager can do, plus wallet settings and API keys.",
};

const APP_ORIGIN = "https://app.nectar-pay.com";

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Throws unless the caller owns the store. */
async function assertOwner(userId: string, storeId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.owner_id !== userId) throw new Error("Store not found or not yours.");
  return data;
}

/** Stores the caller owns — team management is owner-only. */
export const listOwnedStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stores")
      .select("id, name, deactivated_at, owner_id")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((s) => s.owner_id === context.userId && !s.deactivated_at)
      .map((s) => ({ id: s.id, name: s.name }));
  });

export const listStoreTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [membersRes, invitesRes] = await Promise.all([
      supabaseAdmin
        .from("store_members")
        .select("id, user_id, role, created_at")
        .eq("store_id", data.store_id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("store_invites")
        .select("id, email, role, expires_at, accepted_at, created_at")
        .eq("store_id", data.store_id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (membersRes.error) throw new Error(membersRes.error.message);

    const ids = (membersRes.data ?? []).map((m) => m.user_id);
    const profiles = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id, email, full_name").in("user_id", ids)
      : { data: [] as { user_id: string; email: string | null; full_name: string | null }[] };
    const pMap = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));

    const now = Date.now();
    return {
      members: (membersRes.data ?? []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as StoreRole,
        email: pMap.get(m.user_id)?.email ?? null,
        name: pMap.get(m.user_id)?.full_name ?? null,
        created_at: m.created_at,
      })),
      invites: (invitesRes.data ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role as StoreRole,
        expires_at: i.expires_at,
        expired: new Date(i.expires_at).getTime() < now,
      })),
    };
  });

export const inviteStoreUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        email: z.string().email().max(255),
        role: z.enum(["viewer", "manager", "admin"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const store = await assertOwner(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 14 * 86_400_000).toISOString();

    // Drop any previous open invite for the same address on this store.
    await supabaseAdmin
      .from("store_invites")
      .delete()
      .eq("store_id", data.store_id)
      .eq("email", email)
      .is("accepted_at", null);

    const { error } = await supabaseAdmin.from("store_invites").insert({
      store_id: data.store_id,
      email,
      role: data.role,
      token_hash: tokenHash,
      invited_by: context.userId,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    const link = `${APP_ORIGIN}/invite/${token}`;
    const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
    await enqueueAppEmail({
      to: email,
      label: "store_invite",
      subject: `You've been invited to ${store.name} on Nectar-Pay`,
      html: `<p>You've been given <strong>${ROLE_LABEL[data.role]}</strong> access to <strong>${store.name}</strong> on Nectar-Pay.</p>
<p><a href="${link}">Accept your invitation</a></p>
<p>${ROLE_BLURB[data.role]}</p>
<p>This link expires in 14 days. If you weren't expecting it, ignore this email.</p>`,
      text: `You've been given ${ROLE_LABEL[data.role]} access to ${store.name} on Nectar-Pay.\n\nAccept: ${link}\n\nThis link expires in 14 days.`,
    });

    return { ok: true, link };
  });

export const updateStoreMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        store_id: z.string().uuid(),
        member_id: z.string().uuid(),
        role: z.enum(["viewer", "manager", "admin"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("store_members")
      .update({ role: data.role })
      .eq("id", data.member_id)
      .eq("store_id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStoreMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ store_id: z.string().uuid(), member_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("store_members")
      .delete()
      .eq("id", data.member_id)
      .eq("store_id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeStoreInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ store_id: z.string().uuid(), invite_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.store_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("store_invites")
      .delete()
      .eq("id", data.invite_id)
      .eq("store_id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: what does this invite token point at? No sign-in required. */
export const previewStoreInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = await sha256Hex(data.token);
    const { data: invite } = await supabaseAdmin
      .from("store_invites")
      .select("id, email, role, expires_at, accepted_at, store_id, stores(name)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!invite) return { valid: false as const, reason: "not_found" as const };
    if (invite.accepted_at) return { valid: false as const, reason: "used" as const };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { valid: false as const, reason: "expired" as const };
    return {
      valid: true as const,
      email: invite.email,
      role: invite.role as StoreRole,
      store_name: (invite as unknown as { stores: { name: string } | null }).stores?.name ?? "a store",
    };
  });

export const acceptStoreInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = await sha256Hex(data.token);

    const { data: invite } = await supabaseAdmin
      .from("store_invites")
      .select("id, store_id, email, role, expires_at, accepted_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!invite) throw new Error("This invitation link is not valid.");
    if (invite.accepted_at) throw new Error("This invitation has already been used.");
    if (new Date(invite.expires_at).getTime() < Date.now())
      throw new Error("This invitation has expired. Ask for a new one.");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const userEmail = userRes?.user?.email?.toLowerCase() ?? null;
    if (userEmail && userEmail !== invite.email.toLowerCase()) {
      throw new Error(`This invitation was sent to ${invite.email}. Sign in with that address.`);
    }

    const { error: memberErr } = await supabaseAdmin.from("store_members").upsert(
      {
        store_id: invite.store_id,
        user_id: context.userId,
        role: invite.role,
      },
      { onConflict: "store_id,user_id" },
    );
    if (memberErr) throw new Error(memberErr.message);

    await supabaseAdmin
      .from("store_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);

    return { ok: true, store_id: invite.store_id };
  });

/** Stores shared with the signed-in user (not owned by them). */
export const listSharedStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("store_members")
      .select("role, store_id, stores(name, deactivated_at)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((m) => !(m as any).stores?.deactivated_at)
      .map((m) => ({
        store_id: m.store_id,
        role: m.role as StoreRole,
        name: (m as any).stores?.name ?? "Store",
      }));
  });

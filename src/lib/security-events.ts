// Plain-English alert text for risky account changes (security_events rows).
// Pure so wording and coverage are unit-tested.

export type SecurityEventKind =
  | "webhook_changed"
  | "admin_granted"
  | "store_admin_added"
  | "api_key_created"
  | "terminal_paired"
  | "code_lockout";

export interface SecurityEventRow {
  kind: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function describeSecurityEvent(
  e: SecurityEventRow,
  ctx: { storeName?: string | null; actorEmail?: string | null; subjectEmail?: string | null },
): { subject: string; lines: string[] } {
  const store = ctx.storeName ? `"${ctx.storeName}"` : "a store";
  const who = ctx.actorEmail ?? "an unknown account";
  const d = e.detail ?? {};
  const when = `When: ${new Date(e.created_at).toUTCString()}`;
  switch (e.kind as SecurityEventKind) {
    case "webhook_changed":
      return {
        subject: `⚠️ Payment callback settings changed on ${store}`,
        lines: [
          `Changed by: ${who}`,
          `Callback link: ${s(d.old_url) ?? "(none)"} → ${s(d.new_url) ?? "(none)"}`,
          d.secret_changed ? "The callback signing secret was also changed." : "The signing secret was not changed.",
          when,
          "",
          "Whoever holds this secret can tell your website an order was paid. If this wasn't you, sign in and reset it.",
        ],
      };
    case "admin_granted":
      return {
        subject: "⚠️ New NectarPay platform admin",
        lines: [`Admin rights given to: ${ctx.subjectEmail ?? s(d.user_id) ?? "unknown"}`, `By: ${who}`, when],
      };
    case "store_admin_added":
      return {
        subject: `⚠️ New full-access team member on ${store}`,
        lines: [`Added: ${ctx.subjectEmail ?? s(d.user_id) ?? "unknown"}`, `By: ${who}`, when, "", "Full-access members can change wallet keys."],
      };
    case "api_key_created":
      return {
        subject: `New API key on ${store}`,
        lines: [`Key: ${s(d.label) ?? "(no name)"} (${s(d.prefix) ?? "?"}…)`, `Created by: ${who}`, when, "", "If this wasn't you, revoke it on the store's API keys page."],
      };
    case "terminal_paired":
      return {
        subject: `New payment terminal paired to ${store}`,
        lines: [`Terminal: ${s(d.label) ?? "(no name)"}${s(d.device_model) ? ` · ${s(d.device_model)}` : ""}`, when, "", "If you don't recognise it, revoke it on the store's Terminals page."],
      };
    case "code_lockout":
      return {
        subject: `⚠️ Wallet-key code guessed wrong 5 times on ${store}`,
        lines: [`Account: ${who}`, when, "", "Someone tried to change this store's wallet keys and failed the emailed code. The code is now locked."],
      };
    default:
      return { subject: `Security event on ${store}`, lines: [`Type: ${e.kind}`, `By: ${who}`, when] };
  }
}

/** Store owners hear about their own store's events; admins hear about everything. */
export function ownerShouldHear(kind: string): boolean {
  return kind !== "admin_granted";
}

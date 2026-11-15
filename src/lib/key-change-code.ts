// Who receives the emailed 6-digit code for a wallet / payout change.
// Owners and platform admins confirm with their own sign-in email; a
// full-access team member needs the store owner's code, so a hijacked or
// planted team account cannot approve its own payout change.
export function codeRecipient(actor: { isOwner: boolean; isPlatformAdmin: boolean }): "self" | "owner" {
  return actor.isOwner || actor.isPlatformAdmin ? "self" : "owner";
}

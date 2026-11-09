// Pure helpers for sign-up email screening (no app imports, so tests run standalone).

export const BLOCKED_SIGNUP_MESSAGE =
  "Please use your real business or personal email. Throwaway inbox addresses aren't accepted.";

const WALLET_LOGIN_DOMAIN = "wallet.payhme.local";

export function emailDomain(email: string | null | undefined): string {
  const at = (email ?? "").lastIndexOf("@");
  return at < 0 ? "" : (email ?? "").slice(at + 1).trim().toLowerCase();
}

/** True when the email's domain (or a parent domain) is on the blocked list. */
export function domainBlocked(email: string | null | undefined, blocked: Iterable<string>): boolean {
  const dom = emailDomain(email);
  if (!dom || dom === WALLET_LOGIN_DOMAIN) return false;
  for (const b of blocked) {
    const d = b.trim().toLowerCase();
    if (d && (dom === d || dom.endsWith(`.${d}`))) return true;
  }
  return false;
}

/** Turn the backend's refusal into a message a shopkeeper understands. */
export function friendlySignupError(message: string): string {
  return /database error saving new user|email provider are not allowed/i.test(message)
    ? BLOCKED_SIGNUP_MESSAGE
    : message;
}

/**
 * Admin hint: why a sign-up looks like a robot/test account, or null when it looks real.
 * Wallet logins are never flagged.
 */
export function testAccountFlag(
  email: string | null | undefined,
  blocked: Iterable<string> = [],
): string | null {
  const dom = emailDomain(email);
  if (!dom || dom === WALLET_LOGIN_DOMAIN) return null;
  const local = (email ?? "").slice(0, (email ?? "").lastIndexOf("@")).toLowerCase();
  if (/^example\.[a-z]+$/.test(dom) || /\.(test|invalid|example|localhost)$/.test(dom)) {
    return "Test address";
  }
  if (domainBlocked(email, blocked)) return "Throwaway inbox";
  if (/(pentest|probe|nonexist)|^qa[._-]/.test(local)) return "Test-style name";
  // Robots stamp names with the computer clock (10+ digits, e.g. 1794244376)
  if (/1[7-9]\d{8}/.test(local)) return "Robot-made name";
  return null;
}

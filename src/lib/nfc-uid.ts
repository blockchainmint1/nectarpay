// The card UID the terminal puts on the wire is exactly what
// NectarNfcPlugin.bytesToHex() produced (lowercase hex, no separators).
// Anything that stands in for a tap — the inspector QR an iPhone scans,
// the Copy UID button — must carry that same string, so a paired card
// matches the card the terminal later presents.
//
// CryptoPOP normalizes case on its side (nfc-card.server.ts normalizeUid
// strips non-alphanumerics and uppercases), so a different case would
// still work *today*. We keep the wire value anyway: a future partner
// wallet may compare the string as-is.

/** The exact UID to encode/copy: raw device value, outer whitespace trimmed. */
export function uidPayload(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

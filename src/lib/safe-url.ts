// Only ordinary web links may be used for shopper redirects. Anything else
// (javascript:, data:, vbscript:, file:, blob:, …) runs code or opens local
// content on OUR origin, where a signed-in merchant's session lives.

/** Returns a normalised http(s) URL, or null when the value isn't one. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname) return null;
  return parsed.toString();
}

export function isSafeHttpUrl(value: string | null | undefined): boolean {
  return safeHttpUrl(value) !== null;
}

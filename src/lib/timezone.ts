// Timezone helpers (browser- and server-safe). Sales are stored in UTC; these
// decide how they are grouped into business days and how times are shown.

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Use the zone if valid, otherwise the fallback (default UTC). */
export function safeTimeZone(tz: string | null | undefined, fallback = "UTC"): string {
  return isValidTimeZone(tz) ? tz : isValidTimeZone(fallback) ? fallback : "UTC";
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const COMMON = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

/** Common zones first, then every zone the runtime knows. */
export function timeZoneOptions(): string[] {
  let all: string[] = [];
  try {
    all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    all = [];
  }
  return [...COMMON, ...all.filter((z) => !COMMON.includes(z))];
}

export type ZonedParts = { date: string; month: string; hour: number; weekday: number };

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Calendar date / month / hour / weekday of an instant as seen in `tz`. */
export function zonedParts(iso: string | Date, tz: string): ZonedParts {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return { date, month: date.slice(0, 7), hour: Number(get("hour")) % 24, weekday: WD[get("weekday")] ?? 0 };
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function offsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"), n("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of local wall time `YYYY-MM-DD` + h:m:s.ms in `tz`. */
export function zonedTimeToUtc(date: string, tz: string, h = 0, m = 0, s = 0, ms = 0): Date {
  const zone = safeTimeZone(tz);
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!, h, m, s, ms);
  let t = guess - offsetMs(new Date(guess), zone);
  t = guess - offsetMs(new Date(t), zone); // second pass settles DST edges
  return new Date(t);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/** Format an instant for display in `tz` (null = device). */
export function formatDateTime(iso: string | Date, tz?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, { ...(opts ?? { dateStyle: "medium", timeStyle: "short" }), ...(isValidTimeZone(tz) ? { timeZone: tz } : {}) });
}

export function formatDate(iso: string | Date, tz?: string | null): string {
  return formatDateTime(iso, tz, { dateStyle: "medium" });
}

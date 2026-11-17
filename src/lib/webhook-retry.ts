// Pure retry policy for outbound store callbacks (webhooks). Browser-safe.

/** Minutes to wait after the Nth failed attempt (1-based). */
export const WEBHOOK_BACKOFF_MINUTES = [1, 5, 15, 60, 240, 720, 1440] as const;
/** Attempts before we stop retrying (first send + retries). */
export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_BACKOFF_MINUTES.length + 1;
/** How long one sender holds a callback before another may pick it up. */
export const WEBHOOK_LEASE_MS = 2 * 60_000;

/** Delay before the next try after `attemptsMade` failures, or null to give up. */
export function webhookRetryDelayMs(attemptsMade: number): number | null {
  if (!Number.isFinite(attemptsMade) || attemptsMade < 1) return WEBHOOK_BACKOFF_MINUTES[0] * 60_000;
  if (attemptsMade >= WEBHOOK_MAX_ATTEMPTS) return null;
  return WEBHOOK_BACKOFF_MINUTES[attemptsMade - 1] * 60_000;
}

const ORDER: Record<string, number> = {
  "invoice.underpaid": 0,
  "invoice.paid": 1,
  "invoice.overpaid": 1,
  "invoice.confirmed": 2,
};

/** Send the payment event before the final `invoice.confirmed` for one sale. */
export function sortWebhookRows<T extends { created_at: string; event_type?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const t = a.created_at.localeCompare(b.created_at);
    if (t !== 0) return t;
    return (ORDER[a.event_type ?? ""] ?? 9) - (ORDER[b.event_type ?? ""] ?? 9);
  });
}

export function isDeliveredStatus(status: number | null | undefined): boolean {
  return typeof status === "number" && status >= 200 && status < 300;
}

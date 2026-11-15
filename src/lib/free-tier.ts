// Free-tier clock: started once, never restarted by switching the metric.
// Why: re-picking the metric used to reset the start date, giving an endless trial.
export function freeTierStartPatch(existingStartedAt: string | null | undefined, now: Date = new Date()): { free_tier_started_at?: string } {
  return existingStartedAt ? {} : { free_tier_started_at: now.toISOString() };
}

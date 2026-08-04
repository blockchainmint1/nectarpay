// Public live stats aggregator for /live.
// No auth: this data is intentionally public and refreshed every 30s.

import { createServerFn } from "@tanstack/react-start";

export type { LiveStats } from "./live-stats.types";

export const getLiveStats = createServerFn({ method: "GET" }).handler(async () => {
  const { computeLiveStats } = await import("./live-stats.server");
  return computeLiveStats();
});

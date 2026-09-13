// Shared shapes for the merchant reports suite (browser-safe: types only).

export type ReportFilters = {
  storeId?: string | null;
  chain?: string | null;
  from: string; // ISO
  to: string;   // ISO
  compare?: boolean;
};

export type Totals = {
  volume: number;
  count: number;
  average: number;
  unpaidValue: number;
  unpaidCount: number;
  expiredValue: number;
  expiredCount: number;
};

export type SeriesPoint = { bucket: string; volume: number; count: number };

export type ReportBundle = {
  generated_at: string;
  currency: string;
  range: { from: string; to: string; days: number; grain: "day" | "month" };
  totals: Totals;
  previous: Totals | null;
  series: SeriesPoint[];
  byWeekday: Array<{ label: string; volume: number; count: number }>;
  byHour: Array<{ hour: number; volume: number; count: number }>;
  best: { day: SeriesPoint | null; hour: number | null };
  byChain: Array<{ key: string; label: string; volume: number; count: number; average: number }>;
  byToken: Array<{ token: string; volume: number; count: number; average: number; stable: boolean }>;
  stableSplit: { stable: number; volatile: number };
  byStore: Array<{ id: string; name: string; volume: number; count: number; average: number }>;
  terminals: Array<{
    id: string;
    label: string;
    store: string;
    lastSeen: string | null;
    city: string | null;
    country: string | null;
    revoked: boolean;
  }>;
  shareLinks: Array<{ id: string; slug: string; title: string | null; store: string; views: number; active: boolean }>;
  invoicing: {
    emailed: number;
    opened: number;
    paidAfterEmail: number;
    expired: number;
    avgMinutesToPay: number | null;
  };
  repeatPayers: Array<{ email: string; count: number; volume: number; last: string }>;
  settlement: Array<{ token: string; chain: string; cryptoAmount: number; usd: number; count: number }>;
  savings: { periodUsd: number; cardFeeUsd: number; nectarFeeUsd: number };
  tax: Array<{ month: string; currency: string; gross: number; taxEstimate: number; net: number; count: number }>;
};

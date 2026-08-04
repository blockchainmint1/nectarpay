// Shared shape for the public live stats payload (browser-safe: types only).

export type LiveStats = {
  generated_at: string;
  merchants: { total: number; new_30d: number; active_30d: number };
  terminals: { total: number; online_24h: number; countries: number };
  handhelds: { total: number };
  rewards: { total_txc: number; total_usd: number; recipients: number };
  transactions: {
    total: number;
    last_30d: number;
    volume_usd_all_time: number;
    volume_usd_30d: number;
    recent: Array<{
      id: string;
      created_at: string;
      chain: string | null;
      token: string | null;
      crypto_amount: number | null;
      fiat_amount: number;
      fiat_currency: string;
      country: string | null;
      city: string | null;
      tx_hash: string | null;
    }>;
  };
  settlement: {
    by_currency: Array<{ currency: string; count: number; volume: number }>;
    by_chain: Array<{ chain: string; count: number; volume_usd: number }>;
    by_token: Array<{ token: string; count: number }>;
  };
  by_country: Array<{ country: string; count: number; volume_usd: number }>;
  savings: {
    total_usd: number;
    last_30d_usd: number;
    per_merchant_avg_usd: number;
  };
  network: {
    members_geo_total: number;
    top_states: Array<{ state: string; count: number }>;
  };
};

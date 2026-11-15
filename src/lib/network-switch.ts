/**
 * Networks retired platform-wide (Nov 2026): no real payment ever arrived on
 * them. The database trigger chain_configs_force_retired_off keeps them
 * switched off for every store, so removing a chain here alone won't revive it.
 */
export const RETIRED_CHAINS: readonly string[] = ["tron", "sol", "bch", "dash", "bsc"];

export function isChainRetired(chain: string | null | undefined): boolean {
  return !!chain && RETIRED_CHAINS.includes(chain);
}

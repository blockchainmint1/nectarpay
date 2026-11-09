/**
 * Platform-wide Lightning switch. Off since Nov 2026: no store had it enabled
 * and no Lightning sale was ever paid. The database also refuses
 * chain_configs rows with chain = 'lightning' AND enabled (check constraint
 * chain_configs_lightning_disabled), so flipping this alone won't re-enable it.
 */
export const LIGHTNING_ENABLED = false;

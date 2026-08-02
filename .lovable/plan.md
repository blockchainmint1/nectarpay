## Short answer

Yes — all four are cheap to add because they're Bitcoin forks and reuse the exact BTC-like rail we already run for BTC and TEXITcoin: merchant supplies an xpub, we derive a fresh receive address per invoice, a watcher polls an indexer, mempool-accept + confirmations logic is shared. No new custody, no new key handling.

The only real work is per-coin address parameters and one new indexer adapter.

## What's already there vs. missing

- `chain_kind` in the database already includes `doge`, `ltc`, `bch` — **`dash` needs adding**.
- `ChainKind` in code has `doge` but not `ltc`/`bch`/`dash`, and none of the four have a network definition, watcher wiring, POS/checkout entry, or a chain card in store setup.

## Per-coin parameters

| Coin | SLIP-44 | P2PKH / P2SH | Address notes | Confirms |
|---|---|---|---|---|
| Litecoin | 2 | 0x30 / 0x32 | bech32 `ltc1`, use native segwit | 3 (~7 min) |
| Dogecoin | 3 | 0x1e / 0x16 | legacy P2PKH only | 6 (~6 min) |
| Bitcoin Cash | 145 | 0x00 / 0x05 | must emit **CashAddr** (`bitcoincash:q…`) in QR, not legacy | 2 (~20 min) |
| Dash | 5 | 0x4c / 0x10 | legacy only; InstantSend allows near-instant accept | 2, or 1 + InstantSend lock |

## The one real engineering item: indexers

Our watcher speaks Esplora. Coverage differs:

- **Litecoin** — Esplora-compatible (`litecoinspace.org/api`). Drops in with zero adapter work.
- **BCH / DOGE / DASH** — no reliable public Esplora. These need a **Blockbook adapter** (Trezor's public Blockbook nodes expose address UTXOs, txs, and mempool over a stable REST API). That's one new module implementing the same interface the Esplora client exposes, then each network declares which backend it uses.

Dash bonus: Blockbook surfaces InstantSend lock status, so Dash can settle in ~2 seconds — the best in-person UX of the four, worth marketing.

## Suggested build order

1. Add `dash` to the chain enum; extend `ChainKind` with `ltc`, `bch`, `dash`.
2. Ship **Litecoin first** — Esplora path, proves the pattern end to end with no new backend code.
3. Build the Blockbook adapter behind the existing indexer interface.
4. Ship **Dash** (InstantSend), then **Dogecoin**, then **BCH** (CashAddr encoder is the extra piece).
5. Rates: all four are on CoinMarketCap already — the existing rate cache covers them.
6. Store setup: four new chain cards, native-only (no stables on these chains), off by default so merchants opt in.
7. POS/checkout ordering: TSD stays pinned first; the new rails slot after the stablecoins.

## Other communities worth courting

Ranked by "hardcore supporters + real wallet adoption + low integration cost":

- **Monero (XMR)** — by far the most ideological, merchant-friendly community; famously loyal. Integration is heavier (view-key scanning, subaddresses, no xpub), but the goodwill payoff is the largest of any coin here.
- **Zcash (ZEC)** — transparent addresses are a Bitcoin fork, so t-addr support is nearly free; the shielded side is a bigger lift. Well-funded, vocal community.
- **Kaspa (KAS)** — extremely active, growth-minded community; 1-second blocks make it a great POS story. Needs its own node/API adapter.
- **Nano (XNO)** — feeless, instant, purpose-built for point-of-sale; small but fiercely dedicated merchant-adoption crowd.
- **DigiByte (DGB)** — Bitcoin fork, so nearly free to add once Blockbook exists; long-time loyalists.
- **Pepecoin / meme rails** — same Dogecoin codebase, essentially free once DOGE ships; unpredictable but real spending communities.

Worth skipping for now: XRP and XLM (community is exchange-centric, less self-custody spending), and BSV.

## Technical notes

New network definitions go in `src/lib/chains/networks.ts` as `BtcLikeNetwork` entries with an added `indexer: "esplora" | "blockbook"` discriminator; the Blockbook client lands next to the existing Esplora client and returns the same shapes so `watcher.functions.ts` needs no per-chain branching. CashAddr encoding lives in the address-derivation layer so QR and explorer links stay consistent. Adding `dash` to `chain_kind` is a database migration and must run before any code references it.

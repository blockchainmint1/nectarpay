<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- ZCU (chain id 90031273) is an EVM chain sharing the ETH xpub but scanned via its own RPC (src/lib/chains/zcu.server.ts), not Alchemy; native only; price comes from wzcu.zerochill.com Uniswap 30m TWAP in pollRates (admin override available).
- EVM push notifications are hints: resolve assets by configured contracts and use the shared on-chain scanner and guarded transaction recorder before settlement, so token metadata cannot authorize payment.
- Direct user grants on stores, terminals, and API keys must exclude secret reads; secret writes use authorized server operations (API-key fingerprint insertion is write-only), so team row visibility cannot reveal credentials.
- Wallet login verifies the persisted server-issued message, uses allowlisted callback origins, and binds token polling/exchange to an HttpOnly browser cookie; conditional state transitions prevent replay.
- Security regression tests run with the standalone Vitest configuration, not the application Vite plugins, so tests can exercise pure security helpers without starting SSR.
- HME Vault links stores via its watch-only pairing QR (src/lib/vault-link/), always gated by the emailed wallet-link code (src/lib/wallet-link-challenge.server.ts); EVM is linked only from an account xpub, never a single address. Its server-only preview helper shows TXC/EVM index 0 for comparison only; sales and monitoring still start at index 1. Why: merchants must verify the same wallet without exposing the reserved main address to payment settlement.
- App emails use a single server-only SES transport, while Cloud auth retains its managed signed handler; this preserves sign-in verification while honoring the app sender choice.
- Customer lists aggregate all paid invoice history through the authenticated caller's RLS-scoped client, grouped by store and normalized email with currency-separated totals; marketing consent is stored separately and written only by validated checkout or paired-terminal operations so receipt capture never implies consent.
- The customer-list route disables SSR because the existing merchant layout hydrates its browser session before displaying children; its authenticated loader must not run without that browser bearer token.
- Wallet-change history reads the existing trigger-backed chain_config_audit through the caller's RLS-scoped client, paginated newest-first; wallet saves refresh it without adding a second audit writer, so every linking path shares one durable record.
- Store pages use /stores/<url_slug>; the $storeId layout resolves slug or legacy UUID into StoreRefContext (useStoreRef) and rewrites UUID URLs to the slug. Why: readable merchant URLs without breaking old links or child-page queries keyed by id.
- Store logos live in a private store-logos bucket and are served via /api/public/store-logo/<storeId>/<file> (raster types only). Why: workspace blocks public buckets; avoids serving SVG/HTML from our origin.

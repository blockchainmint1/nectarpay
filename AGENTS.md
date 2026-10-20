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

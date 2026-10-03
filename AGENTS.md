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
- ZCU (chain id 90031273) is an EVM chain sharing the ETH xpub but scanned via its own RPC (src/lib/chains/zcu.server.ts), not Alchemy; native only; price is admin-set in rates_cache — no public feed exists.

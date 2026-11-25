# Roadmap

## Fast merchant sticker launch
- [x] Add Avery 5160/8160 and 5163/8163 template selection, quantities/start position, alignment adjustments, merchant sticker formatting, PDF download and print opening in Admin → Fast Start; signed-in merchant downloads verified, both PDF sheets visually inspected, spacing/blank preview corrected, both QR codes decoded at 300dpi to the exact sticker URL; 4 placement tests passed. Physical label alignment needs a plain-paper printer check.
- [x] Fix wallet-paid sticker settlement: signed /stickers/paid checks invoice/sticker binding and blockchain evidence, cron includes static-address bills; Bobby’s 2.55 TSD tx recovered to confirmed with one claim, repeat callback safe, customer page shows Payment received; scheduled checker scans two remaining sticker bills with no errors; 47 tests passed; CryptoPOP handoff updated.
- [x] Move Website first and prefill editable business/contact/address/description; real Cold Storage Coins website returned name/email/description, preserved entered phone, left unavailable address blank; description saved with enrollment and copied during activation.
- [x] Put coin heading, scan, asset ID, Check and public key on one tablet/desktop line; verified at 1207px and no overflow on phone.
- [x] Improve /fast for iPad with private signature capture, required non-custodial/basic-setup acknowledgements, directory listing and TSD-only/instant-confirm defaults; tablet/phone interactions checked, schema and activation defaults verified.
- [ ] Verify a newly signed Fast Start enrollment saves its signature and directory choice and goes live: requires an unused merchant coin ID; existing dQdbix is already enrolled and was not overwritten.
- [x] Keep a Fast Start signature retrievable later: the drawn signature is stored as an image file in private storage beside the agreement version and signing time, and Admin → Fast enrollments opens it on demand. Verified with a signature drawn live on the /fast pad (11,491-byte PNG) placed on the test enrollment — it rendered in the merchant record with the agreement line and signing time; 19 tests passed.
- [x] Document the Fast Start Program as the first /docs chapter: coin/sticker kit, public enrollment, automatic go-live, welcome/account handover, shopper payments, alerts, Give/POP and verified launch status; contents navigation and phone layout checked, no browser errors.
- [x] Keep the test→success flow amount-agnostic: no fixed figure anywhere, the test page says "any amount", and the success page prints the amount that actually arrived (checked with $12.34, $250.00 and $0.50); 185 tests passed.
- [x] Remove the sticker payment amount ceiling everywhere: sticker page, partner lookup/invoice APIs and the invoice-creation database rule now accept any positive whole-cent amount ($5,000, $1,000,000 and a $1,500 browser checkout all created tracked bills; zero, negative and sub-cent refused; lookup no longer advertises min/max); 185 tests passed.
- [x] Add signed partner sticker lookup/invoice APIs; screenshot QR verified as /s/dQdbix; $2.50 invoice created at the correct TSD address, signed responses checked, unsigned/wrong-case/overlapping requests refused, checkout visible, 39 tests passed.
- [ ] Finish CryptoPOP post-send reporting: snapshot confirms scanner/invoice-before-send work and Bobby paid 2.55 TSD; CryptoPOP must add the signed /stickers/paid call after broadcast and persist retries (read-only from this chat). Republish NectarPay and CryptoPOP; confirm real reward response, subject to own-store/new-store safeguards.
- [x] Connect case-sensitive coin/sticker codes to an approved live merchant and checkout.
- [x] Add atomic admin-managed starter-store activation and printable sticker access; no email-only account ownership claims.
- [x] Verify public dQdbix enrollment, admin activation, printable QR and $1 TSD invoice at the correct cold-coin address; wrong-case and overlapping checkout refused; 20 tests passed.
- [x] Collect an optional merchant website on the public /fast form (normalized to a real link, shown in Admin, copied into the store profile when the starter store is activated); 145 tests passed.
- [x] Auto go-live after the double coin check, welcome email (sticker link, 14-day Telegram alert link, create-login link), store-level Telegram alerts; admin sees welcome status; 148 tests passed.
- [ ] Text-message and WhatsApp alerts: deferred by Bobby (need Twilio / Meta approval).
- [ ] Confirm real merchant alert delivery: Bobby’s 2.55 TSD payment is verified and recovered; inbox/Telegram delivery needs merchant confirmation. Starter safety defaults are one checkout at a time; sticker sales have no amount ceiling.
- [ ] Merchant account claiming/transfer remains a later ownership-verification step; starter stores are admin-managed, not falsely assigned to submitted emails.
- [x] Confirm sticker format: preserve existing https://app.nectar-pay.com/s/<case-sensitive-coin-ID>; CryptoPOP must recognize it and call the signed lookup/start contract before sending.
- [x] Fix address-bar opens of admin pages landing on Overview: the admin layout now renders only in the browser, so /admin/fast, /admin/give and /admin/invoices open directly and survive a refresh.

## CryptoPOP NFC checkout
- [x] Connect exact-body server-signed CryptoPOP requests, bound approval status checks, and shared invoice callback helpers.
- [x] Add PIN collection/retry, waiting-for-owner, reader failures, and sent-to-invoice-monitoring states; pending payments disable cancel/QR switching.
- [x] Nine NFC safety tests passed (22 with SSO regression tests); simulated $1.23 checkout exercised tap, wrong PIN, retry, approval, polling, and sent without prematurely marking paid; no browser errors.
- [ ] Verify shared NFC_PAY_SECRET against published CryptoPOP: read-only signed unknown-payment lookup returned 401 Bad signature; matching saved values and CryptoPOP publishing require confirmation.
- [ ] Verify a real funded-card tap after both apps are published; requires a paired physical terminal/card and cardholder approval. CryptoPOP Telegram bot selection remains in its own project; NectarPay did not take over another bot.

## Honest Money popup return
- [x] Fix numeric popup=1 validation and restore the popup-to-main-window handoff when the browser removes the opener; real browser callback closes the popup and reports rejected diagnostic tickets in the parent; 13 tests passed.
- [ ] Verify a real Honest Money sign-in after publishing; requires the member's email-code approval.

## HME credential cutover and referral review
- [x] Use Bobby's corrected HME_ECOSYSTEM key for safe connection checks: empty member lookup returned 200; another site code returned 401.
- [x] Check the replaced ecosystem key and deleted HMAC secret against current Honest Money instructions: only SSO referenced the deleted credential; card relay uses the ecosystem key.
- [x] Align SSO verification and permanent member matching; Account now offers a verified-session first connection, and all four sign-in options remain visible.
- [x] Align referral capture, preserve referral through the entry redirect, and report server-side Hub signup events with stored delivery status; 21 relevant tests passed.
- [ ] Real Honest Money account connection and subsequent sign-in: requires Bobby to complete Honest Money's email-code popup, then retry from signed-out state after publishing.
- [ ] Real referral signup readback in Honest Money: requires a new legitimate signup; no fake member or signup event was sent.
- [x] Replace retired wallet card relay with CryptoPOP's documented NFC protocol; live signature and funded-card verification are tracked above.

## Store info save failure
- [x] Restore authenticated access to the new public-email field without exposing store secrets; six tests passed, and Bobby's Nectar-Pay store saved successfully and read back after reload.

## SES and customer receipts
- [x] Move app email delivery to verified AWS SES; SES accepted one connection-check email to Bobby.
- [x] Wire customer receipts after settlement/email capture; show failures on the terminal; six tests passed.
- [ ] Real terminal receipt/inbox check: requires a paired terminal's completed sale and recipient confirmation; not exercised end-to-end yet.
- [ ] All-auth SES switch: managed Cloud auth sending must remain intact; external transport is not supported here.

## Customer signatures on sales
- [x] Store each captured signature as a real image file in a private bucket; all 63 previously signed sales converted with none skipped, and the inline copy is kept only if a file upload fails.
- [x] Show the signature on the sale record page with a Download signature button; verified signed-in — the image rendered and the download produced an 18,504-byte PNG named signature-2ebde28b.png, with no console or page errors.
- [x] Put the signature inside the emailed receipt (sent as an inline image, not a link); SES accepted a real receipt send to Bobby's own address with a recorded delivery ID, and the raw-message builder is covered by tests for structure and header-injection refusal.
- [x] Print the signature on the terminal straight after the receipt using the printer's existing image command, and show it on the paid screen.
- [ ] Printed signature on paper and the inline image as it renders in a real inbox: requires a physical terminal print and Bobby's confirmation of the emailed receipt.
- [x] Build merchant customer list from historical sales, with store filters and CSV download.
- [x] Add separate, unchecked, store-specific marketing opt-in on POS receipts and customer checkout, with recorded consent.
- [x] Verify customer aggregation, consent rules, and merchant view: 17 tests passed; Bobby's signed-in view shows 78 customer records and 97 purchases; filters and CSV verified; checkout defaults unchecked.
- [ ] Real POS/checkout consent submission with receipt delivery: requires a customer-approved email and completed terminal sale; automated consent-storage tests passed, but no real customer's preference was changed.

## Priority security audit fixes
- [x] Verify real EVM token contracts and use guarded payment recording for Alchemy notifications.
- [x] Hide store, API-key, and terminal secrets from direct user access while preserving authorized controls.
- [x] Bind wallet sign-in to the canonical NectarPay message and originating browser.
- [x] Run 22 regression tests, live signed-message/replay/theft checks, direct authenticated permission checks, and signed-in store/terminal page checks.
- [ ] Real EVM payment and full external-wallet sign-in: requires an actual payment and the owner's wallet; no funds sent or test accounts created.

## Merchant self-service account admin (/account)
- [x] Change email address (double-confirm via branded email-change template)
- [x] TOTP two-factor authentication: enroll (QR), verify, disable
- [x] MFA gate on the authenticated area (aal1 → aal2 challenge before dashboard renders)
- [x] Display name edit (profiles.full_name)
- [x] "Sign out of all devices" (global session revoke)

## Crypto address / transaction verifier
- [x] Admin verifier at /admin/verify (all stores, xpub scan, on-chain lookup)
- [x] Merchant "is this a good transaction?" verifier at /verify (scoped to own stores)

## Store team access (/account/users)
- [x] Invite people by email to a single store with View only / Manager / Full access
- [x] Accept flow at /invite/<token>, change level or remove access, cancel pending invites
- [x] Access rules enforced in the database (owner-only: wallet setup, billing, closing a store)
- [x] Send one combined invitation when granting access to multiple or all stores

- [x] Merchant reports suite at /reports (summary, sales, methods, stores & devices, customers & invoices, settlement & fees, tax)

## Merchant payment notifications
- [x] Branded sale receipt email with store, amount, payment method, invoice, and order details
- [x] Celebratory paid-sale message and clear underpayment warning
- [x] Branded subscription renewal receipts and friendly billing warnings
- [x] Send Bobby a sample of the upgraded billing renewal email.

## HME Give church list
- [x] Accept HME Give's signed church list (pull every 5 min + push hook), keep last good list as backup, local admin block
- [ ] Go live — their list URL and signing address are saved here; waiting on their list page going live and our website publish

## Security audit (Nov 9 2026)
- [x] Block script "return links" on checkout (input check, safe render, database rule); 4 booby-trapped test sales cleaned.
- [x] Remove the Android signing-key helper that printed the key into build logs; remove the outdated package-lock.json.
- [x] Wallet-key change alerts can't be muted (sign-in email + every linked Telegram) and admins get a copy.
- [ ] Bobby: delete old Android build runs in GitHub Actions and decide on replacing the app signing key (details kept privately).
- [x] Wallet keys can only be changed through the server (browser direct writes removed); owner/full-access team/admin only. Admins kept, but always need the emailed code.
- [x] Emailed 6-digit code for every wallet-key change except a store's very first key; 2-step login enforced by the database for users who turned it on. Code prompt verified in browser (code sent, nothing saved without it).
- [x] 4-hour wait before a replacement key takes payments; old wallet keeps getting paid, owner can Cancel. Verified hand-over in an undone practice run and Cancel in the browser.
- [x] Monitoring: unmutable alerts to owner + admins for webhook changes, new platform/store admins, new API keys, new terminals, code lockouts; webhook alert verified (no secrets in it).
- [x] Auditor follow-up on booby-trapped return links: all found on test accounts only; no real wallet/admin/team/key/webhook changes; closed the hole letting merchants mark their own sales paid.
- [ ] Decide what to do with the audit's test accounts (awaiting Bobby).
- [ ] Real end-to-end replacement with an emailed code typed in, and real alert email arrival: needs Bobby to try it on a test store.
- [x] Still open from earlier report: free trial fixed and Capacitor upgraded Nov 15; Lightning sweep race moot while Lightning is off.
- [ ] Solana amount rounding overcharge (e.g. $5 SOL sale asked 0.0649 SOL ≈ $5.63).

## Lightning node wind-down (Nov 10 2026)
- [x] Closed the node's payment channel cooperatively; funds returned to the node wallet.
- [x] Swept the node wallet to Bobby's own wallet.
- [x] Close confirmed; swept the remainder. Node wallet is at 0.
- [x] Node server shut down and removed (Nov 11); verified nothing is running or billing. Settings kept so it can be revived later.
- [ ] Optional cleanup: remove the old node's DNS name (harmless while it points nowhere).

## Security re-audit (Nov 15 2026)
- [x] Upgrade the app shell (Capacitor 8.4.1 → 8.6.2), seroval (1.6.8 → 1.6.12) and zod (3.25 → 4.6.7); 226 tests passed, main pages load.
- [x] N1 Tangem USDC payout address behind the emailed code, 4-hour hold and alerts; browser direct writes refused. Verified end-to-end on Cold Coin Auto Test (code → waiting banner → cancel; both alerts delivered).
- [x] N3 4-hour hold for a new coin's first key on an established store (brand-new stores and same-wallet reuse stay immediate); rolled-back practice run verified.
- [x] N2 2-step login enforced in team invite/role/remove/accept; key-change code goes to the owner when a team member acts.
- [x] N4 team-member cancels of pending changes need the owner's code; owners still cancel in one click.
- [x] N5 website lookup capped (10 per visitor per 10 min, 200 site-wide per hour); HME Give hook returns "disconnected" and calls nothing.
- [x] N6 duplicate open amounts on shared addresses refused by the database; sale creation retries with a new tail (practice run verified).
- [x] M3 free-trial clock can no longer be restarted by switching the trial type.
- [x] M6 merchants can no longer change store owner, admin market/rep/notes, or reactivate a switched-off store (practice run verified).
- [ ] Rebuild the POS APK with the new app shell: Bobby runs GitHub → Actions → "POS APK" → Run workflow (or pushes to pos-app).
- [ ] Still open from the audit, not done this round: M4 terminal secrets stored plainly (already unreadable from browsers), M8 plan change not atomic, M9 webhook URL private-network guard, M10 email relay limits, M11 debuggable register app / pinned Tangem SDK.

## Mistaken BNB Chain payments (Nov 19 2026)
- [x] Fix the Verify payment crash and look up unrecorded payments live on Ethereum, Base, BNB Chain and ZCU.
- [x] Mark a merchant's $400 sale paid with its mistaken BNB Chain USDT payment; callbacks delivered, owner alerts sent.
- [x] Keep BNB Chain hidden from shoppers but watch it for mistaken USDT/USDC payments; exact matches are marked paid (Bobby's choice), others wait for the merchant.

## Wallet balances
- [x] Trace a merchant's unexplained Base USDC: real sales paid on Base, already recorded as paid (relabelled Base).
- [x] Rebuild the Wallet balances page: live full-scan total, paid-sales comparison, coin mix, per-network cards with funded addresses, empty-address toggle, copy/explorer links; retired networks shown only when holding money.
- [x] Count each wallet's first address (#0) in Wallet balances when a sale was paid there.
- [x] Price BNB so the Wallet balances page stops counting it as $0: the live rates poller now asks CoinMarketCap for BNB and files it under the existing "bsc" chain key (rates_cache has no "bnb" key), and a new test refuses any network whose native coin has no price source. Shows on the live site's next price poll after publishing.
- [x] Final blockchain check before Ethereum/Base sales expire (one missed on-time payment credited by hand).
- [x] Every coin: last look before expiry (TXC/TSD/BTC/LTC/DOGE/ZCU too), expiry runs after the payment scan.
- [x] Sales whose payment is seen but still confirming wait instead of expiring (24h cap).
- [x] Late/missed payments on any wallet address land in the merchant's 'payments that didn't match' card, and the merchant can apply them.
- [x] Late payments found in the sweep: Bobby said mark paid — re-verified on chain, recorded and settled each.
- [x] Three EVM address settings per store (one address / rotate+recycle / rotate+never reuse); recycling waits for the late-payment hour.

## Reviews of Nov 23 changes
- [x] Address re-use checks every EVM network (an open Base sale blocks re-using that address for Ethereum), in one lookup instead of one per address.
- [x] Address numbers are handed out atomically, so two sales started at once never share an address (closes audit M7).
- [x] Remove private details (personal wallet, server, customer and merchant specifics) from these notes and test examples.
- [ ] Bobby: switch the GitHub repo to private, and delete old Android build runs; older copies of these notes stay in the repo's history until then.

## Wallet balances
- [x] Always check address #0 on every monitored network plus every address the store has handed out, on the Wallet balances page and the store's Wallet Balance card (they share one scan); SEEDS checked live: 104 addresses, main TEXITcoin address showed 22,000 TSD that was hidden before; 276 tests passed.

## Give Back wording
- [x] Replace "church" with "charitable organization" (or "charity" where space is tight) on every customer- and merchant-facing screen and email: Give Back page, store page tile, eGiving report, POS receipt line, customer receipt email, Fast Start page, merchant Docs guide, API reference, Admin → Give labels, merchant pitch/manifesto/CryptoPOP training and the README. Database values, internal names and test fixtures unchanged.

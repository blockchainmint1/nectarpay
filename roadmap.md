# Roadmap

## Fast merchant sticker launch
- [x] Connect case-sensitive coin/sticker codes to an approved live merchant and checkout.
- [x] Add atomic admin-managed starter-store activation and printable sticker access; no email-only account ownership claims.
- [x] Verify public dQdbix enrollment, admin activation, printable QR and $1 TSD invoice at the correct cold-coin address; wrong-case and overlapping checkout refused; 20 tests passed.
- [x] Collect an optional merchant website on the public /fast form (normalized to a real link, shown in Admin, copied into the store profile when the starter store is activated); 145 tests passed.
- [x] Auto go-live after the double coin check, welcome email (sticker link, 14-day Telegram alert link, create-login link), store-level Telegram alerts; admin sees welcome status; 148 tests passed.
- [ ] Text-message and WhatsApp alerts: deferred by Bobby (need Twilio / Meta approval).
- [ ] Verify real payment and merchant alert: Bobby must pay the test invoice after website publication; no funds sent. Starter safety defaults are one checkout at a time and $0.50–$250.
- [ ] Merchant account claiming/transfer remains a later ownership-verification step; starter stores are admin-managed, not falsely assigned to submitted emails.

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

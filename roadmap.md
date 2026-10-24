# Roadmap

## SES and customer receipts
- [x] Move app email delivery to verified AWS SES; SES accepted one connection-check email to Bobby.
- [x] Wire customer receipts after settlement/email capture; show failures on the terminal; six tests passed.
- [ ] Real terminal receipt/inbox check: requires a paired terminal's completed sale and recipient confirmation; not exercised end-to-end yet.
- [ ] All-auth SES switch: managed Cloud auth sending must remain intact; external transport is not supported here.
- [ ] Build merchant customer list from historical sales, with store filters and CSV download.
- [ ] Add separate, unchecked, store-specific marketing opt-in on POS receipts and customer checkout, with recorded consent.
- [ ] Verify customer aggregation, consent rules, and merchant view.

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

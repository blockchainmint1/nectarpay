# Roadmap

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

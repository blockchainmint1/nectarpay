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

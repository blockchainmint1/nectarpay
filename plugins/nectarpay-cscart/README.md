# NectarPay for CS-Cart

Non-custodial crypto payments for CS-Cart 4.x — BTC, TEXITcoin (TXC), and stablecoins settle straight to your wallet.

## Install

1. Copy `app/addons/nectarpay` into your CS-Cart root.
2. Admin → Add-ons → Manage add-ons → install **NectarPay crypto payments**.
3. Admin → Administration → Payment methods → **+** → Processor: *NectarPay*.
4. Configure tab: paste your **API key** (`sk_live_…`) and **webhook secret** from the NectarPay dashboard.
5. NectarPay dashboard → Webhooks → set URL:
   `https://your-store.com/index.php?dispatch=payment_notification.process&payment=nectarpay`

## Flow

Checkout → `POST /api/public/v1/invoices` → shopper redirected to the hosted NectarPay pay page (QR + amount) → signed webhook (`X-TXCPay-Signature`, HMAC-SHA256, 5-minute freshness) marks the order **Paid** on `invoice.confirmed`. We never custody funds.

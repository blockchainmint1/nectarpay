# NectarPay for OpenCart 3.x

Non-custodial crypto payments (BTC, TEXITcoin, stablecoins).

## Install

1. Zip the `upload/` folder contents as `nectarpay.ocmod.zip` (the zip root must
   contain the `upload/` folder), or upload `upload/*` to your store root via FTP.
2. OpenCart admin → **Extensions → Installer** → upload the zip (or if you used
   FTP, skip this step).
3. **Extensions → Extensions → Payments** → install **NectarPay**, then edit and
   paste your **API key**, **Webhook secret** and keep the default API base URL.
4. In the NectarPay dashboard → Webhooks, set the URL to:
   `https://your-store.com/index.php?route=extension/payment/nectarpay/webhook`

## How it works

- Confirm order → creates a NectarPay invoice → redirects the shopper to the
  hosted pay page (QR + amount) → returns to the OpenCart success page.
- On on-chain confirmation the signed webhook moves the order to "Processing"
  and notifies the customer.

## Compatibility

- OpenCart 3.0.x (PHP 7.4+)

## License

MIT.

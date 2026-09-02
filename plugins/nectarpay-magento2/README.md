# NectarPay for Magento 2 / Adobe Commerce

Non-custodial crypto payments (BTC, TEXITcoin, stablecoins).

## Install

1. Copy `app/code/NectarPay` into your Magento installation.
2. Run:

   ```sh
   bin/magento module:enable NectarPay_Payment
   bin/magento setup:upgrade
   bin/magento cache:flush
   ```

   (In production mode also `bin/magento setup:di:compile && bin/magento setup:static-content:deploy`.)
3. **Stores → Configuration → Sales → Payment Methods → NectarPay (crypto)**:
   enable it and paste your **API key** and **Webhook secret** from the
   NectarPay dashboard.
4. In the NectarPay dashboard → Webhooks, set the URL to:
   `https://your-store.com/nectarpay/webhook`

## How it works

- Place Order → the module creates a NectarPay invoice → shopper is redirected
  to the hosted pay page (QR + amount) → returns to the Magento success page.
- On on-chain confirmation the signed webhook moves the order to **Processing**
  and records the NectarPay invoice ID as the transaction ID.

## Compatibility

- Magento Open Source / Adobe Commerce 2.4.x (PHP 7.4+/8.x)

## License

MIT.

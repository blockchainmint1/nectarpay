=== NectarPay for WooCommerce ===
Contributors: nectarpay
Tags: woocommerce, cryptocurrency, bitcoin, stablecoin, payment gateway
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Accept non-custodial crypto payments in WooCommerce — Bitcoin, TEXITcoin and stablecoins settle straight to your own wallet.

== Description ==

NectarPay is a **non-custodial** crypto payment gateway for WooCommerce. Funds go directly from the shopper to a wallet you control — NectarPay never holds, pools, or forwards customer money.

At checkout the plugin creates a NectarPay invoice over the REST API and sends the shopper to a hosted pay page with a QR code and per-chain amounts. When the payment confirms on-chain, NectarPay delivers a signed webhook and the order is marked paid automatically.

**Supported assets**

* Bitcoin (BTC)
* TEXITcoin (TXC) and Texas Stable Dollar (TSD)
* Litecoin, Dogecoin, Bitcoin Cash, Dash
* Stablecoins on Ethereum: USDT, USDC, PYUSD

**Why merchants use it**

* Non-custodial — your keys, your funds, no payout delay
* No chargebacks
* Flat, low service fee; no card interchange
* Hosted pay page handles exchange rates, address rotation and confirmations
* Works with Woo HPOS (High-Performance Order Storage)

**Requires an account.** You need a free NectarPay merchant account at [app.nectar-pay.com](https://app.nectar-pay.com) to obtain an API key and webhook signing secret. The plugin communicates only with your configured NectarPay API base URL (default `https://app.nectar-pay.com`).

== Third Party Services ==

This plugin relies on the NectarPay API to create invoices and report payment status.

* Service: NectarPay — https://app.nectar-pay.com
* Endpoint used: `POST {api_base}/api/public/v1/invoices`
* Data sent: order total, currency, order number and order ID, and the return/success URLs of your store. No customer payment credentials are transmitted.
* Terms: https://nectar-pay.com/terms
* Privacy policy: https://nectar-pay.com/privacy

== Installation ==

1. Upload the plugin zip via **Plugins → Add New → Upload Plugin**, then activate it.
2. Go to **WooCommerce → Settings → Payments → NectarPay**.
3. Paste your **API key** (NectarPay dashboard → API keys) and **Webhook secret** (NectarPay dashboard → Webhooks → Signing secret).
4. Leave **API base URL** as `https://app.nectar-pay.com` unless instructed otherwise.
5. In the NectarPay dashboard, set the store webhook URL to `https://your-shop.example/?wc-api=nectarpay`.
6. Enable the gateway and place a test order.

== Frequently Asked Questions ==

= Is this custodial? =
No. Invoice addresses are derived from an extended public key you supply in your NectarPay account, so payments land in your wallet directly.

= Do I need an account? =
Yes — a free NectarPay merchant account provides the API key and webhook secret.

= What happens if a shopper underpays or pays late? =
The order stays pending and the webhook fires when the on-chain amount confirms. Under/over/late payments are visible in the NectarPay dashboard, and the address verifier tool tells you whether a given transaction belongs to your store.

= Does it work with HPOS? =
Yes, the plugin declares `custom_order_tables` compatibility.

= Are refunds supported? =
Crypto payments are push-only, so refunds are issued manually from your wallet.

== Screenshots ==

1. NectarPay gateway settings in WooCommerce.
2. NectarPay at checkout alongside other payment methods.
3. Hosted pay page with QR code and per-chain amounts.
4. Order marked paid automatically after the signed webhook.
5. Payments overview in the NectarPay merchant dashboard.

== Changelog ==

= 1.0.0 =
* Initial release: hosted invoice checkout, signed `invoice.confirmed` webhook, HPOS compatibility.

== Upgrade Notice ==

= 1.0.0 =
First public release.

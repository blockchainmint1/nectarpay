<?php
/**
 * Plugin Name:       NectarPay for WooCommerce
 * Description:       Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Creates a NectarPay invoice via REST and redirects the shopper to the hosted pay page. A signed webhook marks the order paid.
 * Version:           1.0.0
 * Author:            NectarPay
 * License:           MIT
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 6.0
 * WC tested up to:   9.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NECTARPAY_WC_VERSION', '1.0.0');
define('NECTARPAY_WC_DEFAULT_API_BASE', 'https://app.nectar-pay.com');

// Declare HPOS (High-Performance Order Storage) compatibility.
add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

add_action('plugins_loaded', 'nectarpay_wc_init');

function nectarpay_wc_init()
{
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class WC_NectarPay_Gateway extends WC_Payment_Gateway
    {
        public function __construct()
        {
            $this->id                 = 'nectarpay';
            $this->icon               = '';
            $this->has_fields         = false;
            $this->method_title       = __('NectarPay', 'nectarpay');
            $this->method_description = __('Accept BTC, TEXITcoin and stablecoins. Non-custodial — funds settle straight to your wallet.', 'nectarpay');

            $this->init_form_fields();
            $this->init_settings();

            $this->title       = $this->get_option('title');
            $this->description = $this->get_option('description');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        }

        public function init_form_fields()
        {
            $this->form_fields = [
                'enabled' => [
                    'title'   => __('Enable/Disable', 'nectarpay'),
                    'type'    => 'checkbox',
                    'label'   => __('Enable NectarPay crypto payments', 'nectarpay'),
                    'default' => 'no',
                ],
                'title' => [
                    'title'   => __('Title', 'nectarpay'),
                    'type'    => 'text',
                    'default' => __('Pay with crypto (BTC, TXC, stablecoins)', 'nectarpay'),
                ],
                'description' => [
                    'title'   => __('Description', 'nectarpay'),
                    'type'    => 'textarea',
                    'default' => __('You will be redirected to a secure NectarPay payment page.', 'nectarpay'),
                ],
                'api_key' => [
                    'title'       => __('API key', 'nectarpay'),
                    'type'        => 'password',
                    'description' => __('sk_live_… from NectarPay Dashboard → API keys', 'nectarpay'),
                    'default'     => '',
                ],
                'webhook_secret' => [
                    'title'       => __('Webhook secret', 'nectarpay'),
                    'type'        => 'password',
                    'description' => sprintf(
                        /* translators: %s: webhook URL to paste into the NectarPay dashboard */
                        __('NectarPay Dashboard → Webhooks → Signing secret. Set the webhook URL there to %s', 'nectarpay'),
                        '<code>' . esc_html(home_url('/?wc-api=nectarpay')) . '</code>'
                    ),
                    'default'     => '',
                ],
                'api_base' => [
                    'title'   => __('API base URL', 'nectarpay'),
                    'type'    => 'text',
                    'default' => NECTARPAY_WC_DEFAULT_API_BASE,
                ],
            ];
        }

        public function process_payment($order_id)
        {
            $order = wc_get_order($order_id);
            if (!$order) {
                wc_add_notice(__('Order not found.', 'nectarpay'), 'error');
                return ['result' => 'failure'];
            }

            $api_base = rtrim($this->get_option('api_base') ?: NECTARPAY_WC_DEFAULT_API_BASE, '/');
            $api_key  = $this->get_option('api_key');

            // Match the NectarPay public API shape exactly:
            //   POST /api/public/v1/invoices  Bearer sk_live_...
            //   { amount, currency, order_id?, description?, redirect_url? }
            $payload = [
                'amount'       => (float) $order->get_total(),
                'currency'     => $order->get_currency(),
                'order_id'     => (string) $order->get_id(),   // echoed back in webhooks as data.order_id
                'description'  => 'WooCommerce order #' . $order->get_order_number(),
                'redirect_url' => $this->get_return_url($order),
            ];

            $response = wp_remote_post($api_base . '/api/public/v1/invoices', [
                'timeout' => 15,
                'headers' => [
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . $api_key,
                ],
                'body'    => wp_json_encode($payload),
            ]);

            if (is_wp_error($response)) {
                wc_get_logger()->error('NectarPay invoice create failed: ' . $response->get_error_message(), ['source' => 'nectarpay']);
                wc_add_notice(__('Could not start a crypto payment. Please try again or pick another method.', 'nectarpay'), 'error');
                return ['result' => 'failure'];
            }

            $status = wp_remote_retrieve_response_code($response);
            $data   = json_decode(wp_remote_retrieve_body($response), true);

            if ($status >= 200 && $status < 300 && !empty($data['checkout_url']) && !empty($data['id'])) {
                // Persist the NectarPay invoice ID on the order so the webhook
                // handler (and the merchant, later) can reconcile against the
                // NectarPay admin panel.
                $order->update_meta_data('_nectarpay_invoice_id', sanitize_text_field($data['id']));
                $order->set_transaction_id(sanitize_text_field($data['id']));
                $order->save();

                return [
                    'result'   => 'success',
                    'redirect' => $data['checkout_url'],
                ];
            }

            wc_get_logger()->error('NectarPay invoice create failed [' . $status . '] ' . wp_remote_retrieve_body($response), ['source' => 'nectarpay']);
            wc_add_notice(__('Could not start a crypto payment. Please try again or pick another method.', 'nectarpay'), 'error');
            return ['result' => 'failure'];
        }
    }

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_NectarPay_Gateway';
        return $gateways;
    });

    // Webhook receiver: https://shop.example.com/?wc-api=nectarpay
    add_action('woocommerce_api_nectarpay', 'nectarpay_wc_handle_webhook');
}

/**
 * Receives signed webhooks from NectarPay and marks the order paid.
 *
 * Signature: header `X-TXCPay-Signature: t=<unix>,v1=<hex>` where v1 is
 * HMAC-SHA256("<t>.<rawBody>", store.webhook_secret).
 *
 * Events: invoice.paid | invoice.underpaid | invoice.confirmed
 * We settle the order on `invoice.confirmed` (fully settled).
 */
function nectarpay_wc_handle_webhook()
{
    $raw     = file_get_contents('php://input');
    $sig     = isset($_SERVER['HTTP_X_TXCPAY_SIGNATURE']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_TXCPAY_SIGNATURE'])) : '';
    $gateway = new WC_NectarPay_Gateway();
    $secret  = $gateway->get_option('webhook_secret');

    $respond = function ($code, $msg) {
        status_header($code);
        header('Content-Type: text/plain');
        echo esc_html($msg);
        exit;
    };

    if (!$secret || !$sig || !$raw) {
        $respond(400, 'missing signature');
    }

    // Parse `t=<unix>,v1=<hex>`.
    $t = null;
    $v1 = null;
    foreach (explode(',', $sig) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) !== 2) {
            continue;
        }
        if ($kv[0] === 't') {
            $t = $kv[1];
        }
        if ($kv[0] === 'v1') {
            $v1 = $kv[1];
        }
    }
    if (!$t || !$v1) {
        $respond(400, 'malformed signature');
    }

    // Reject replays older than 5 minutes.
    if (abs(time() - (int) $t) > 300) {
        $respond(401, 'stale timestamp');
    }

    $expected = hash_hmac('sha256', $t . '.' . $raw, $secret);
    if (!hash_equals($expected, $v1)) {
        wc_get_logger()->warning('NectarPay: webhook signature mismatch', ['source' => 'nectarpay']);
        $respond(401, 'invalid signature');
    }

    $event = json_decode($raw, true);
    if (!$event || empty($event['type']) || empty($event['data'])) {
        $respond(400, 'bad payload');
    }

    // Only settle the order on final confirmation.
    if ($event['type'] !== 'invoice.confirmed') {
        $respond(200, 'ignored');
    }

    $order_id = isset($event['data']['order_id']) ? absint($event['data']['order_id']) : 0;
    $inv_id   = isset($event['data']['invoice_id']) ? sanitize_text_field($event['data']['invoice_id']) : '';

    if (!$order_id) {
        $respond(400, 'missing order_id');
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        $respond(404, 'order not found');
    }

    // Idempotency — webhooks can be retried.
    if ($order->is_paid()) {
        $respond(200, 'already recorded');
    }

    $order->payment_complete($inv_id);
    $order->add_order_note(sprintf(
        /* translators: %s: NectarPay invoice ID */
        __('NectarPay payment confirmed on-chain. Invoice %s', 'nectarpay'),
        $inv_id
    ));

    $respond(200, 'ok');
}

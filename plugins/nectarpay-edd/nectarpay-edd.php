<?php
/**
 * Plugin Name:       NectarPay for Easy Digital Downloads
 * Description:       Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Creates a NectarPay invoice via REST and redirects the shopper to the hosted pay page. A signed webhook marks the payment complete.
 * Version:           1.0.0
 * Author:            NectarPay
 * Plugin URI:        https://app.nectar-pay.com/integrations
 * Author URI:        https://nectar-pay.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       nectarpay-edd
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NECTARPAY_EDD_DEFAULT_API_BASE', 'https://app.nectar-pay.com');

add_filter('edd_payment_gateways', function ($gateways) {
    $gateways['nectarpay'] = [
        'admin_label'    => __('NectarPay (crypto)', 'nectarpay-edd'),
        'checkout_label' => __('Pay with crypto (BTC, TXC, stablecoins)', 'nectarpay-edd'),
    ];
    return $gateways;
});

// Settings: Downloads → Settings → Payments → NectarPay.
add_filter('edd_settings_sections_gateways', function ($sections) {
    $sections['nectarpay'] = __('NectarPay', 'nectarpay-edd');
    return $sections;
});

add_filter('edd_settings_gateways', function ($settings) {
    $settings['nectarpay'] = [
        'nectarpay_api_key' => [
            'id'   => 'nectarpay_api_key',
            'name' => __('API key', 'nectarpay-edd'),
            'desc' => __('sk_live_… from NectarPay Dashboard → API keys', 'nectarpay-edd'),
            'type' => 'password',
        ],
        'nectarpay_webhook_secret' => [
            'id'   => 'nectarpay_webhook_secret',
            'name' => __('Webhook secret', 'nectarpay-edd'),
            'desc' => sprintf(
                /* translators: %s: webhook URL to paste into the NectarPay dashboard */
                __('NectarPay Dashboard → Webhooks → Signing secret. Set the webhook URL there to %s', 'nectarpay-edd'),
                '<code>' . esc_html(home_url('/?nectarpay-webhook=1')) . '</code>'
            ),
            'type' => 'password',
        ],
        'nectarpay_api_base' => [
            'id'      => 'nectarpay_api_base',
            'name'    => __('API base URL', 'nectarpay-edd'),
            'type'    => 'text',
            'std'     => NECTARPAY_EDD_DEFAULT_API_BASE,
        ],
    ];
    return $settings;
});

// Straight to the gateway — no card fields on the checkout form.
add_action('edd_nectarpay_cc_form', '__return_false');

// Build the purchase and redirect to the hosted pay page.
add_action('edd_gateway_nectarpay', function ($purchase_data) {
    $payment_data = [
        'price'        => $purchase_data['price'],
        'date'         => $purchase_data['date'],
        'user_email'   => $purchase_data['user_email'],
        'purchase_key' => $purchase_data['purchase_key'],
        'currency'     => edd_get_currency(),
        'downloads'    => $purchase_data['downloads'],
        'cart_details' => $purchase_data['cart_details'],
        'user_info'    => $purchase_data['user_info'],
        'status'       => 'pending',
        'gateway'      => 'nectarpay',
    ];

    $payment_id = edd_insert_payment($payment_data);
    if (!$payment_id) {
        edd_record_gateway_error(__('Payment Error', 'nectarpay-edd'), __('Could not create the payment record.', 'nectarpay-edd'));
        edd_send_back_to_checkout('?payment-mode=nectarpay');
        return;
    }

    $api_base = rtrim(edd_get_option('nectarpay_api_base', NECTARPAY_EDD_DEFAULT_API_BASE), '/');
    $payload = [
        'amount'       => (float) $purchase_data['price'],
        'currency'     => edd_get_currency(),
        'order_id'     => (string) $payment_id,
        'description'  => get_bloginfo('name') . ' order #' . $payment_id,
        'redirect_url' => edd_get_success_page_uri(),
    ];

    $response = wp_remote_post($api_base . '/api/public/v1/invoices', [
        'timeout' => 15,
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . edd_get_option('nectarpay_api_key', ''),
        ],
        'body'    => wp_json_encode($payload),
    ]);

    $data = is_wp_error($response) ? null : json_decode(wp_remote_retrieve_body($response), true);

    if ($data && !empty($data['checkout_url']) && !empty($data['id'])) {
        edd_update_payment_meta($payment_id, '_nectarpay_invoice_id', sanitize_text_field($data['id']));
        wp_redirect($data['checkout_url']);
        exit;
    }

    edd_record_gateway_error(
        __('NectarPay Error', 'nectarpay-edd'),
        sprintf('Invoice create failed: %s', is_wp_error($response) ? $response->get_error_message() : wp_remote_retrieve_body($response))
    );
    edd_send_back_to_checkout('?payment-mode=nectarpay');
});

// Webhook receiver: https://site.example/?nectarpay-webhook=1
// Signature: X-TXCPay-Signature: t=<unix>,v1=HMAC-SHA256("<t>.<rawBody>", secret).
add_action('init', function () {
    if (empty($_GET['nectarpay-webhook'])) {
        return;
    }

    $respond = function ($code, $msg) {
        status_header($code);
        header('Content-Type: text/plain');
        echo esc_html($msg);
        exit;
    };

    $raw    = file_get_contents('php://input');
    $sig    = isset($_SERVER['HTTP_X_TXCPAY_SIGNATURE']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_TXCPAY_SIGNATURE'])) : '';
    $secret = edd_get_option('nectarpay_webhook_secret', '');

    if (!$secret || !$sig || !$raw) {
        $respond(400, 'missing signature');
    }

    $t = null;
    $v1 = null;
    foreach (explode(',', $sig) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) !== 2) {
            continue;
        }
        if ($kv[0] === 't') $t = $kv[1];
        if ($kv[0] === 'v1') $v1 = $kv[1];
    }
    if (!$t || !$v1) {
        $respond(400, 'malformed signature');
    }
    if (abs(time() - (int) $t) > 300) {
        $respond(401, 'stale timestamp');
    }
    if (!hash_equals(hash_hmac('sha256', $t . '.' . $raw, $secret), $v1)) {
        $respond(401, 'invalid signature');
    }

    $event = json_decode($raw, true);
    if (!$event || empty($event['type']) || empty($event['data'])) {
        $respond(400, 'bad payload');
    }
    if ($event['type'] !== 'invoice.confirmed') {
        $respond(200, 'ignored');
    }

    $payment_id = isset($event['data']['order_id']) ? absint($event['data']['order_id']) : 0;
    $inv_id     = isset($event['data']['invoice_id']) ? sanitize_text_field($event['data']['invoice_id']) : '';
    if (!$payment_id || !edd_get_payment($payment_id)) {
        $respond(404, 'payment not found');
    }

    // Idempotency — webhooks can be retried.
    if (edd_get_payment_status($payment_id) === 'publish') {
        $respond(200, 'already recorded');
    }

    edd_set_payment_transaction_id($payment_id, $inv_id);
    edd_update_payment_status($payment_id, 'publish');
    edd_insert_payment_note($payment_id, sprintf(
        /* translators: %s: NectarPay invoice ID */
        __('NectarPay payment confirmed on-chain. Invoice %s', 'nectarpay-edd'),
        $inv_id
    ));

    $respond(200, 'ok');
});

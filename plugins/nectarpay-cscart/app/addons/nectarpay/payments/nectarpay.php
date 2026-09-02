<?php
/**
 * NectarPay payment processor for CS-Cart 4.x.
 *
 * Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Creates a
 * NectarPay invoice via REST and redirects the shopper to the hosted pay
 * page. The signed webhook (dispatch=payment_notification.process&payment=nectarpay)
 * marks the order paid on invoice.confirmed.
 *
 * Install: copy the addon folder to app/addons/nectarpay and the payment
 * processor to app/addons/nectarpay/payments/nectarpay.php, install the
 * addon in Admin → Add-ons, then add a payment method using the
 * "NectarPay" processor. Set the webhook URL in the NectarPay dashboard:
 *   https://your-store.com/index.php?dispatch=payment_notification.process&payment=nectarpay
 */

use Tygh\Http;

if (!defined('BOOTSTRAP')) {
    // Webhook (notification) context — CS-Cart includes this file with order info.
    die('Access denied');
}

defined('IN_NECTARPAY_CALLBACK') or define('IN_NECTARPAY_CALLBACK', false);

if (defined('PAYMENT_NOTIFICATION')) {
    // ---- Webhook handling ----
    $raw = file_get_contents('php://input');
    $sig = isset($_SERVER['HTTP_X_TXCPAY_SIGNATURE']) ? $_SERVER['HTTP_X_TXCPAY_SIGNATURE'] : '';

    $t = null;
    $v1 = null;
    foreach (explode(',', $sig) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) !== 2) continue;
        if ($kv[0] === 't') $t = $kv[1];
        if ($kv[0] === 'v1') $v1 = $kv[1];
    }

    $secret = $processor_data['processor_params']['webhook_secret'];
    if (!$t || !$v1 || abs(time() - (int) $t) > 300
        || !hash_equals(hash_hmac('sha256', $t . '.' . $raw, $secret), $v1)) {
        header('HTTP/1.1 401 Unauthorized');
        echo 'invalid signature';
        exit;
    }

    $event = json_decode($raw, true);
    if (!$event || empty($event['type'])) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }
    if ($event['type'] !== 'invoice.confirmed') {
        echo 'ignored';
        exit;
    }

    $order_id = isset($event['data']['order_id']) ? (int) $event['data']['order_id'] : 0;
    if (!$order_id) {
        header('HTTP/1.1 400 Bad Request');
        echo 'missing order_id';
        exit;
    }

    if (fn_check_payment_script('nectarpay.php', $order_id)) {
        $pp_response = [
            'order_status' => 'P',
            'reason_text' => 'NectarPay invoice confirmed: ' . (string) ($event['data']['invoice_id'] ?? ''),
        ];
        fn_finish_payment($order_id, $pp_response, false);
        fn_order_placement_routines('route', $order_id);
    }
    echo 'ok';
    exit;
}

// ---- Checkout: create NectarPay invoice and redirect ----
$api_base = rtrim($processor_data['processor_params']['api_base'] ?: 'https://app.nectar-pay.com', '/');

$payload = [
    'amount' => (float) $order_info['total'],
    'currency' => $order_info['secondary_currency'] ?: CART_PRIMARY_CURRENCY,
    'order_id' => (string) $order_info['order_id'],
    'description' => 'CS-Cart order #' . $order_info['order_id'],
    'redirect_url' => fn_url("orders.details?order_id={$order_info['order_id']}", 'C', 'current'),
];

$response = Http::post(
    $api_base . '/api/public/v1/invoices',
    json_encode($payload),
    [
        'headers' => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $processor_data['processor_params']['api_key'],
        ],
        'timeout' => 15,
    ]
);

$data = json_decode((string) $response, true);
if (!empty($data['checkout_url'])) {
    fn_create_payment_form($data['checkout_url'], [], 'NectarPay', true, 'get');
}

fn_set_notification('E', __('error'), 'Could not start a crypto payment. Please try another payment method.');
fn_order_placement_routines('checkout_redirect', $order_info['order_id'], false);

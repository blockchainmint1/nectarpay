<?php
/**
 * NectarPay webhook receiver for Zen Cart.
 *
 * Place at the store root. Set in NectarPay dashboard → Webhooks:
 *   https://your-store.com/nectarpay_webhook.php
 *
 * Signature: X-TXCPay-Signature: t=<unix>,v1=<hex> where v1 is
 * HMAC-SHA256("<t>.<rawBody>", webhookSecret). Settles on invoice.confirmed.
 */

require __DIR__ . '/includes/application_top.php';

$respond = function ($code, $msg) {
    http_response_code($code);
    header('Content-Type: text/plain');
    echo $msg;
    exit;
};

$raw = file_get_contents('php://input');
$sig = isset($_SERVER['HTTP_X_TXCPAY_SIGNATURE']) ? $_SERVER['HTTP_X_TXCPAY_SIGNATURE'] : '';
$secret = defined('MODULE_PAYMENT_NECTARPAY_WEBHOOK_SECRET') ? MODULE_PAYMENT_NECTARPAY_WEBHOOK_SECRET : '';

if (!$secret || !$sig || !$raw) {
    $respond(400, 'missing signature');
}

$t = null;
$v1 = null;
foreach (explode(',', $sig) as $part) {
    $kv = explode('=', trim($part), 2);
    if (count($kv) !== 2) continue;
    if ($kv[0] === 't') $t = $kv[1];
    if ($kv[0] === 'v1') $v1 = $kv[1];
}
if (!$t || !$v1 || abs(time() - (int) $t) > 300
    || !hash_equals(hash_hmac('sha256', $t . '.' . $raw, $secret), $v1)) {
    $respond(401, 'invalid signature');
}

$event = json_decode($raw, true);
if (!$event || empty($event['type'])) {
    $respond(400, 'bad payload');
}
if ($event['type'] !== 'invoice.confirmed') {
    $respond(200, 'ignored');
}

$orderId = isset($event['data']['order_id']) ? (int) $event['data']['order_id'] : 0;
if (!$orderId) {
    $respond(400, 'missing order_id');
}

// Idempotent: skip if already processing/complete.
$check = $db->Execute("SELECT orders_status FROM " . TABLE_ORDERS . " WHERE orders_id = " . (int) $orderId);
if ($check->EOF) {
    $respond(404, 'unknown order');
}
if ((int) $check->fields['orders_status'] >= 2) {
    $respond(200, 'already settled');
}

$comment = 'NectarPay invoice confirmed: ' . (string) ($event['data']['invoice_id'] ?? '');
$db->Execute("UPDATE " . TABLE_ORDERS . " SET orders_status = 2, last_modified = now() WHERE orders_id = " . (int) $orderId);
$db->Execute("INSERT INTO " . TABLE_ORDERS_STATUS_HISTORY . " (orders_id, orders_status_id, date_added, customer_notified, comments)
    VALUES (" . (int) $orderId . ", 2, now(), 0, '" . zen_db_input($comment) . "')");

$respond(200, 'ok');

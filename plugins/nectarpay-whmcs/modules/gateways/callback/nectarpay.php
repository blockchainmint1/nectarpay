<?php
/**
 * NectarPay webhook receiver for WHMCS.
 *
 * Set this URL in the NectarPay dashboard → Webhooks:
 *   https://your-whmcs.com/modules/gateways/callback/nectarpay.php
 *
 * Signature: X-TXCPay-Signature: t=<unix>,v1=<hex> where v1 is
 * HMAC-SHA256("<t>.<rawBody>", webhookSecret). Settles on invoice.confirmed.
 */

require_once __DIR__ . '/../../../init.php';
require_once __DIR__ . '/../../../includes/gatewayfunctions.php';
require_once __DIR__ . '/../../../includes/invoicefunctions.php';

$gatewayModuleName = 'nectarpay';
$gatewayParams = getGatewayVariables($gatewayModuleName);

$respond = function ($code, $msg) {
    http_response_code($code);
    header('Content-Type: text/plain');
    echo $msg;
    exit;
};

if (!$gatewayParams['type']) {
    $respond(403, 'module not activated');
}

$raw = file_get_contents('php://input');
$sig = isset($_SERVER['HTTP_X_TXCPAY_SIGNATURE']) ? $_SERVER['HTTP_X_TXCPAY_SIGNATURE'] : '';
$secret = $gatewayParams['webhookSecret'];

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
    logTransaction($gatewayModuleName, $raw, 'Invalid signature');
    $respond(401, 'invalid signature');
}

$event = json_decode($raw, true);
if (!$event || empty($event['type']) || empty($event['data'])) {
    $respond(400, 'bad payload');
}
if ($event['type'] !== 'invoice.confirmed') {
    $respond(200, 'ignored');
}

$invoiceId = isset($event['data']['order_id']) ? (int) $event['data']['order_id'] : 0;
$txId = isset($event['data']['invoice_id']) ? (string) $event['data']['invoice_id'] : '';
if (!$invoiceId) {
    $respond(400, 'missing order_id');
}

$invoiceId = checkCbInvoiceID($invoiceId, $gatewayParams['name']);
checkCbTransID($txId);

$amount = isset($event['data']['amount']) ? (float) $event['data']['amount'] : 0;
addInvoicePayment($invoiceId, $txId, $amount, 0, $gatewayModuleName);
logTransaction($gatewayModuleName, $event['data'], 'Confirmed');

$respond(200, 'ok');

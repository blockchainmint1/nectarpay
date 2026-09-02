<?php

namespace nectarpay\craftcommerce\controllers;

use Craft;
use craft\commerce\Plugin as Commerce;
use craft\web\Controller;
use yii\web\Response;

/**
 * Signed webhook receiver: verifies X-TXCPay-Signature
 * (t=<unix>,v1=HMAC-SHA256("<t>.<raw>", secret)) and completes the order
 * on invoice.confirmed. CSRF is disabled for this action.
 */
class WebhookController extends Controller
{
    protected array|int|bool $allowAnonymous = true;
    public $enableCsrfValidation = false;

    public function actionIndex(): Response
    {
        $raw = Craft::$app->getRequest()->getRawBody();
        $sig = Craft::$app->getRequest()->getHeaders()->get('X-TXCPay-Signature', '');

        $t = null;
        $v1 = null;
        foreach (explode(',', $sig) as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) !== 2) continue;
            if ($kv[0] === 't') $t = $kv[1];
            if ($kv[0] === 'v1') $v1 = $kv[1];
        }

        $event = json_decode($raw, true);
        if (!$t || !$v1 || !$event || empty($event['type'])) {
            return $this->asRaw('bad request')->setStatusCode(400);
        }

        if ($event['type'] !== 'invoice.confirmed') {
            return $this->asRaw('ignored');
        }

        $orderNumber = (string) ($event['data']['order_id'] ?? '');
        $order = $orderNumber
            ? Commerce::getInstance()->getOrders()->getOrderByNumber($orderNumber)
            : null;
        if (!$order) {
            return $this->asRaw('unknown order')->setStatusCode(404);
        }

        // Find the NectarPay gateway to get its secret.
        $gateway = Commerce::getInstance()->getGateways()->getGatewayById($order->gatewayId);
        $secret = $gateway && isset($gateway->webhookSecret) ? Craft::parseEnv($gateway->webhookSecret) : '';
        if (!$secret || abs(time() - (int) $t) > 300
            || !hash_equals(hash_hmac('sha256', $t . '.' . $raw, $secret), $v1)) {
            return $this->asRaw('invalid signature')->setStatusCode(401);
        }

        if (!$order->isPaid) {
            $order->paymentAmount = $order->getTotalPrice();
            $order->orderStatusId = Commerce::getInstance()->getOrderStatuses()
                ->getDefaultOrderStatusId() ?? $order->orderStatusId;
            $order->message = 'NectarPay invoice confirmed: ' . (string) ($event['data']['invoice_id'] ?? '');
            Craft::$app->getElements()->saveElement($order);
        }

        return $this->asRaw('ok');
    }
}

<?php
/**
 * Receives signed webhooks from NectarPay and validates the order.
 * On `invoice.confirmed`, creates the PrestaShop order and marks it paid.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class NectarPayWebhookModuleFrontController extends ModuleFrontController
{
    public $ssl = true;

    public function postProcess()
    {
        $raw       = file_get_contents('php://input');
        $signature = isset($_SERVER['HTTP_X_NECTARPAY_SIGNATURE']) ? $_SERVER['HTTP_X_NECTARPAY_SIGNATURE'] : '';
        $secret    = Configuration::get(NectarPay::CONFIG_WEBHOOK_SECRET);

        if (!$secret || !$signature || !$raw) {
            $this->respond(400, 'missing signature');
        }

        $expected = hash_hmac('sha256', $raw, $secret);
        if (!hash_equals($expected, $signature)) {
            PrestaShopLogger::addLog('NectarPay: webhook signature mismatch', 3);
            $this->respond(401, 'invalid signature');
        }

        $event = json_decode($raw, true);
        if (!$event || empty($event['type']) || empty($event['data']['order_id'])) {
            $this->respond(400, 'bad payload');
        }

        if ($event['type'] !== 'invoice.confirmed' && $event['type'] !== 'invoice.overpaid') {
            $this->respond(200, 'ignored');
        }

        $id_cart = (int) $event['data']['order_id'];
        $cart    = new Cart($id_cart);
        if (!Validate::isLoadedObject($cart)) {
            $this->respond(404, 'cart not found');
        }

        if (Order::getIdByCartId($cart->id)) {
            $this->respond(200, 'already recorded');
        }

        $customer = new Customer((int) $cart->id_customer);
        $currency = new Currency((int) $cart->id_currency);
        $amount   = (float) $cart->getOrderTotal(true, Cart::BOTH);
        $secure   = md5((string) $cart->id . '-nectarpay');

        $this->module->validateOrder(
            (int) $cart->id,
            (int) Configuration::get('PS_OS_PAYMENT'),
            $amount,
            $this->module->displayName,
            'NectarPay invoice ' . $event['data']['invoice_id'],
            ['transaction_id' => $event['data']['invoice_id']],
            (int) $currency->id,
            false,
            $secure
        );

        $this->respond(200, 'ok');
    }

    private function respond($code, $msg)
    {
        http_response_code($code);
        header('Content-Type: text/plain');
        echo $msg;
        exit;
    }
}

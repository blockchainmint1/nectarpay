<?php
/**
 * NectarPay payment extension for OpenCart 3.x — storefront.
 *
 * Confirm creates a NectarPay invoice and redirects to the hosted pay page.
 * The signed webhook marks the order paid on invoice.confirmed.
 */
class ControllerExtensionPaymentNectarPay extends Controller
{
    public function index()
    {
        $this->load->language('extension/payment/nectarpay');
        $data['button_confirm'] = $this->language->get('button_confirm');
        $data['action'] = $this->url->link('extension/payment/nectarpay/confirm', '', true);
        return $this->load->view('extension/payment/nectarpay', $data);
    }

    public function confirm()
    {
        $this->load->model('checkout/order');
        $this->load->language('extension/payment/nectarpay');

        if (!isset($this->session->data['order_id'])) {
            $this->response->redirect($this->url->link('checkout/checkout', '', true));
            return;
        }

        $order = $this->model_checkout_order->getOrder($this->session->data['order_id']);
        if (!$order) {
            $this->response->redirect($this->url->link('checkout/checkout', '', true));
            return;
        }

        $api_base = rtrim($this->config->get('payment_nectarpay_api_base') ?: 'https://app.nectar-pay.com', '/');
        $total = $this->currency->format($order['total'], $order['currency_code'], $order['currency_value'], false);

        $payload = [
            'amount'       => (float) $total,
            'currency'     => $order['currency_code'],
            'order_id'     => (string) $order['order_id'],
            'description'  => $order['store_name'] . ' order #' . $order['order_id'],
            'redirect_url' => $this->url->link('checkout/success', '', true),
        ];

        $ch = curl_init($api_base . '/api/public/v1/invoices');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->config->get('payment_nectarpay_api_key'),
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode((string) $body, true);
        if ($status >= 200 && $status < 300 && !empty($data['checkout_url']) && !empty($data['id'])) {
            $this->model_checkout_order->addOrderHistory($order['order_id'], $this->config->get('config_order_status_id'), 'NectarPay invoice ' . $data['id'] . ' created — awaiting crypto payment.', false);
            $this->response->redirect($data['checkout_url']);
            return;
        }

        $this->log->write('NectarPay invoice create failed [' . $status . '] ' . $body);
        $this->session->data['error'] = $this->language->get('error_create');
        $this->response->redirect($this->url->link('checkout/checkout', '', true));
    }

    /**
     * Webhook: X-TXCPay-Signature: t=<unix>,v1=HMAC-SHA256("<t>.<rawBody>", secret).
     * Settles on invoice.confirmed.
     */
    public function webhook()
    {
        $respond = function ($code, $msg) {
            $this->response->addHeader('HTTP/1.1 ' . $code . ' ' . $msg);
            $this->response->addHeader('Content-Type: text/plain');
            $this->response->setOutput($msg);
            $this->response->output();
            exit;
        };

        $raw = file_get_contents('php://input');
        $sig = isset($this->request->server['HTTP_X_TXCPAY_SIGNATURE']) ? $this->request->server['HTTP_X_TXCPAY_SIGNATURE'] : '';
        $secret = $this->config->get('payment_nectarpay_webhook_secret');

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
            $this->log->write('NectarPay: webhook signature mismatch');
            $respond(401, 'invalid signature');
        }

        $event = json_decode($raw, true);
        if (!$event || empty($event['type']) || empty($event['data'])) {
            $respond(400, 'bad payload');
        }
        if ($event['type'] !== 'invoice.confirmed') {
            $respond(200, 'ignored');
        }

        $order_id = isset($event['data']['order_id']) ? (int) $event['data']['order_id'] : 0;
        $inv_id = isset($event['data']['invoice_id']) ? (string) $event['data']['invoice_id'] : '';
        if (!$order_id) {
            $respond(400, 'missing order_id');
        }

        $this->load->model('checkout/order');
        $order = $this->model_checkout_order->getOrder($order_id);
        if (!$order) {
            $respond(404, 'order not found');
        }

        // Idempotency — webhooks can be retried.
        $complete = (array) $this->config->get('config_complete_status');
        if (in_array((int) $order['order_status_id'], array_map('intval', $complete), true)) {
            $respond(200, 'already recorded');
        }

        $processing = (int) $this->config->get('config_processing_status');
        $this->model_checkout_order->addOrderHistory(
            $order_id,
            $processing ?: 2,
            'NectarPay payment confirmed on-chain. Invoice ' . $inv_id,
            true
        );

        $respond(200, 'ok');
    }
}

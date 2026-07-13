<?php
/**
 * Creates a NectarPay invoice for the current cart and redirects the
 * shopper to the hosted pay page. Order creation happens in the webhook
 * controller once payment is confirmed on-chain.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class NectarPayRedirectModuleFrontController extends ModuleFrontController
{
    public $ssl = true;

    public function postProcess()
    {
        $cart = $this->context->cart;
        if (!$cart->id || !$cart->id_customer || !$cart->id_address_delivery || !$cart->id_address_invoice) {
            Tools::redirect('index.php?controller=order&step=1');
        }

        $api_base       = rtrim(Configuration::get(NectarPay::CONFIG_API_BASE) ?: 'https://nectar-pay.com', '/');
        $api_key        = Configuration::get(NectarPay::CONFIG_API_KEY);
        $store_id       = Configuration::get(NectarPay::CONFIG_STORE_ID);
        $currency       = new Currency((int) $cart->id_currency);
        $total          = (float) $cart->getOrderTotal(true, Cart::BOTH);
        $webhook_url    = $this->context->link->getModuleLink('nectarpay', 'webhook', [], true);
        $return_url     = $this->context->link->getModuleLink('nectarpay', 'return', ['id_cart' => $cart->id], true);

        $payload = [
            'store_id'      => $store_id,
            'fiat_amount'   => $total,
            'fiat_currency' => $currency->iso_code,
            'order_id'      => (string) $cart->id,
            'redirect_url'  => $return_url,
            'webhook_url'   => $webhook_url,
            'metadata'      => [
                'platform' => 'prestashop',
                'ps_cart'  => (int) $cart->id,
                'customer' => (int) $cart->id_customer,
            ],
        ];

        $ch = curl_init($api_base . '/api/public/v1/invoices');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $api_key,
            ],
            CURLOPT_TIMEOUT        => 15,
        ]);
        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status >= 200 && $status < 300 && $body) {
            $data = json_decode($body, true);
            if (!empty($data['pay_url'])) {
                Tools::redirect($data['pay_url']);
            }
        }

        PrestaShopLogger::addLog('NectarPay: invoice create failed [' . $status . '] ' . $body, 3);
        $this->errors[] = $this->module->l('Could not start a crypto payment. Please try again or pick another method.');
        $this->redirectWithNotifications('index.php?controller=order&step=1');
    }
}

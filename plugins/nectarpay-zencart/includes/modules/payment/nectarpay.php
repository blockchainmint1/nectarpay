<?php
/**
 * NectarPay payment module for Zen Cart 1.5.8+ / 2.x.
 *
 * Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Creates a
 * NectarPay invoice via REST and redirects the shopper to the hosted pay
 * page. Set the webhook URL in the NectarPay dashboard:
 *   https://your-store.com/nectarpay_webhook.php
 */

class nectarpay
{
    public $code = 'nectarpay';
    public $title;
    public $description;
    public $enabled;
    public $sort_order;

    public function __construct()
    {
        global $order;
        $this->title = defined('MODULE_PAYMENT_NECTARPAY_TEXT_TITLE')
            ? MODULE_PAYMENT_NECTARPAY_TEXT_TITLE
            : 'Pay with crypto (BTC, TXC, stablecoins)';
        $this->description = 'Non-custodial crypto payments via NectarPay.';
        $this->sort_order = defined('MODULE_PAYMENT_NECTARPAY_SORT_ORDER') ? (int) MODULE_PAYMENT_NECTARPAY_SORT_ORDER : 0;
        $this->enabled = (defined('MODULE_PAYMENT_NECTARPAY_STATUS') && MODULE_PAYMENT_NECTARPAY_STATUS === 'True');
        if (is_object($order)) {
            $this->update_status();
        }
    }

    public function update_status() { return true; }
    public function javascript_validation() { return ''; }

    public function selection()
    {
        return ['id' => $this->code, 'module' => $this->title];
    }

    public function pre_confirmation_check() { return; }

    public function confirmation()
    {
        return ['title' => 'You will be redirected to NectarPay to complete your crypto payment.'];
    }

    public function process_button()
    {
        // Defer: invoice is created in after_process, once we have an order id.
        return '';
    }

    public function before_process() { return true; }

    public function after_process()
    {
        global $insert_id, $order, $messageStack;

        $apiBase = rtrim(MODULE_PAYMENT_NECTARPAY_API_BASE ?: 'https://app.nectar-pay.com', '/');
        $payload = [
            'amount' => (float) $order->info['total'],
            'currency' => $order->info['currency'] ?: (defined('DEFAULT_CURRENCY') ? DEFAULT_CURRENCY : 'USD'),
            'order_id' => (string) $insert_id,
            'description' => 'Zen Cart order #' . $insert_id,
            'redirect_url' => zen_href_link(FILENAME_CHECKOUT_SUCCESS, '', 'SSL'),
        ];

        $ch = curl_init($apiBase . '/api/public/v1/invoices');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . MODULE_PAYMENT_NECTARPAY_API_KEY,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode((string) $body, true);
        if ($status >= 200 && $status < 300 && !empty($data['checkout_url'])) {
            zen_redirect($data['checkout_url']);
        }

        $messageStack->add_session('checkout_payment', 'Could not start a crypto payment. Please choose another method.', 'error');
        zen_redirect(zen_href_link(FILENAME_CHECKOUT_PAYMENT, '', 'SSL'));
    }

    public function get_error() { return ['error' => 'NectarPay payment failed.']; }

    public function check()
    {
        global $db;
        if (!isset($this->_check)) {
            $rs = $db->Execute("SELECT configuration_value FROM " . TABLE_CONFIGURATION . " WHERE configuration_key = 'MODULE_PAYMENT_NECTARPAY_STATUS'");
            $this->_check = !$rs->EOF;
        }
        return $this->_check;
    }

    public function install()
    {
        global $db;
        $db->Execute("INSERT INTO " . TABLE_CONFIGURATION . " (configuration_title, configuration_key, configuration_value, configuration_description, configuration_group_id, sort_order, set_function, date_added)
            VALUES ('Enable NectarPay', 'MODULE_PAYMENT_NECTARPAY_STATUS', 'True', 'Accept crypto payments via NectarPay?', 6, 1, 'zen_cfg_select_option([\'True\', \'False\'], ', now())");
        $db->Execute("INSERT INTO " . TABLE_CONFIGURATION . " (configuration_title, configuration_key, configuration_value, configuration_description, configuration_group_id, sort_order, date_added)
            VALUES ('API key', 'MODULE_PAYMENT_NECTARPAY_API_KEY', '', 'sk_live_… from NectarPay Dashboard → API keys', 6, 2, now())");
        $db->Execute("INSERT INTO " . TABLE_CONFIGURATION . " (configuration_title, configuration_key, configuration_value, configuration_description, configuration_group_id, sort_order, date_added)
            VALUES ('Webhook secret', 'MODULE_PAYMENT_NECTARPAY_WEBHOOK_SECRET', '', 'NectarPay Dashboard → Webhooks → Signing secret', 6, 3, now())");
        $db->Execute("INSERT INTO " . TABLE_CONFIGURATION . " (configuration_title, configuration_key, configuration_value, configuration_description, configuration_group_id, sort_order, date_added)
            VALUES ('API base URL', 'MODULE_PAYMENT_NECTARPAY_API_BASE', 'https://app.nectar-pay.com', 'Leave default unless directed otherwise', 6, 4, now())");
        $db->Execute("INSERT INTO " . TABLE_CONFIGURATION . " (configuration_title, configuration_key, configuration_value, configuration_description, configuration_group_id, sort_order, set_function, date_added)
            VALUES ('Sort order', 'MODULE_PAYMENT_NECTARPAY_SORT_ORDER', '0', 'Display order (lowest first)', 6, 5, NULL, now())");
    }

    public function remove()
    {
        global $db;
        $db->Execute("DELETE FROM " . TABLE_CONFIGURATION . " WHERE configuration_key LIKE 'MODULE_PAYMENT_NECTARPAY_%'");
    }

    public function keys()
    {
        return [
            'MODULE_PAYMENT_NECTARPAY_STATUS',
            'MODULE_PAYMENT_NECTARPAY_API_KEY',
            'MODULE_PAYMENT_NECTARPAY_WEBHOOK_SECRET',
            'MODULE_PAYMENT_NECTARPAY_API_BASE',
            'MODULE_PAYMENT_NECTARPAY_SORT_ORDER',
        ];
    }
}

<?php
/**
 * NectarPay payment extension for OpenCart 3.x — admin settings.
 */
class ControllerExtensionPaymentNectarPay extends Controller
{
    private $error = [];

    public function index()
    {
        $this->load->language('extension/payment/nectarpay');
        $this->document->setTitle($this->language->get('heading_title'));
        $this->load->model('setting/setting');

        if (($this->request->server['REQUEST_METHOD'] === 'POST') && $this->validate()) {
            $this->model_setting_setting->editSetting('payment_nectarpay', $this->request->post);
            $this->session->data['success'] = $this->language->get('text_success');
            $this->response->redirect($this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true));
        }

        $data['error_warning'] = isset($this->error['warning']) ? $this->error['warning'] : '';

        $data['breadcrumbs'] = [
            ['text' => $this->language->get('text_home'), 'href' => $this->url->link('common/dashboard', 'user_token=' . $this->session->data['user_token'], true)],
            ['text' => $this->language->get('text_extension'), 'href' => $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true)],
            ['text' => $this->language->get('heading_title'), 'href' => $this->url->link('extension/payment/nectarpay', 'user_token=' . $this->session->data['user_token'], true)],
        ];

        $data['action'] = $this->url->link('extension/payment/nectarpay', 'user_token=' . $this->session->data['user_token'], true);
        $data['cancel'] = $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true);

        $fields = ['api_key', 'webhook_secret', 'api_base', 'status', 'sort_order'];
        foreach ($fields as $field) {
            $key = 'payment_nectarpay_' . $field;
            if (isset($this->request->post[$key])) {
                $data[$key] = $this->request->post[$key];
            } else {
                $data[$key] = $this->config->get($key);
            }
        }
        if (!$data['payment_nectarpay_api_base']) {
            $data['payment_nectarpay_api_base'] = 'https://app.nectar-pay.com';
        }

        $data['webhook_url'] = HTTPS_CATALOG . 'index.php?route=extension/payment/nectarpay/webhook';

        $data['header'] = $this->load->controller('common/header');
        $data['column_left'] = $this->load->controller('common/column_left');
        $data['footer'] = $this->load->controller('common/footer');

        $this->response->setOutput($this->load->view('extension/payment/nectarpay', $data));
    }

    protected function validate()
    {
        if (!$this->user->hasPermission('modify', 'extension/payment/nectarpay')) {
            $this->error['warning'] = $this->language->get('error_permission');
        }
        return !$this->error;
    }
}

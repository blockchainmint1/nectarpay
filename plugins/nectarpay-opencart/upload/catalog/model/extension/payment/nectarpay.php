<?php
class ModelExtensionPaymentNectarPay extends Model
{
    public function getMethod($address, $total)
    {
        $this->load->language('extension/payment/nectarpay');

        return [
            'code'       => 'nectarpay',
            'title'      => $this->language->get('text_title'),
            'terms'      => '',
            'sort_order' => $this->config->get('payment_nectarpay_sort_order'),
        ];
    }
}

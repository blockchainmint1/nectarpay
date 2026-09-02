<?php
namespace NectarPay\Payment\Controller\Redirect;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\App\CsrfAwareActionInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\App\Request\InvalidRequestException;

/**
 * Creates a NectarPay invoice for the just-placed order and redirects the
 * shopper to the hosted pay page.
 */
class Index implements HttpGetActionInterface, CsrfAwareActionInterface
{
    private $checkoutSession;
    private $scopeConfig;
    private $redirectFactory;
    private $messageManager;
    private $curl;

    public function __construct(
        \Magento\Checkout\Model\Session $checkoutSession,
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig,
        \Magento\Framework\Controller\Result\RedirectFactory $redirectFactory,
        \Magento\Framework\Message\ManagerInterface $messageManager,
        \Magento\Framework\HTTP\Client\Curl $curl
    ) {
        $this->checkoutSession = $checkoutSession;
        $this->scopeConfig = $scopeConfig;
        $this->redirectFactory = $redirectFactory;
        $this->messageManager = $messageManager;
        $this->curl = $curl;
    }

    public function execute()
    {
        $order = $this->checkoutSession->getLastRealOrder();
        $result = $this->redirectFactory->create();

        if (!$order || !$order->getId()) {
            return $result->setPath('checkout/cart');
        }

        $apiBase = rtrim($this->config('api_base') ?: 'https://app.nectar-pay.com', '/');
        $payload = [
            'amount'       => (float) $order->getGrandTotal(),
            'currency'     => $order->getOrderCurrencyCode(),
            'order_id'     => (string) $order->getIncrementId(),
            'description'  => 'Magento order #' . $order->getIncrementId(),
            'redirect_url' => $this->checkoutSession->getLastSuccessUrl()
                ?: rtrim($this->configBaseUrl($order), '/') . '/checkout/onepage/success/',
        ];

        try {
            $this->curl->addHeader('Content-Type', 'application/json');
            $this->curl->addHeader('Authorization', 'Bearer ' . $this->config('api_key'));
            $this->curl->setTimeout(15);
            $this->curl->post($apiBase . '/api/public/v1/invoices', json_encode($payload));

            $status = $this->curl->getStatus();
            $data = json_decode($this->curl->getBody(), true);

            if ($status >= 200 && $status < 300 && !empty($data['checkout_url']) && !empty($data['id'])) {
                $order->addCommentToStatusHistory('NectarPay invoice ' . $data['id'] . ' created — awaiting crypto payment.');
                $order->save();
                return $result->setUrl($data['checkout_url']);
            }

            throw new \Exception('NectarPay invoice create failed [' . $status . '] ' . $this->curl->getBody());
        } catch (\Exception $e) {
            $this->messageManager->addErrorMessage(__('Could not start a crypto payment. Please contact us or pick another payment method.'));
            return $result->setPath('checkout/cart');
        }
    }

    private function config($field)
    {
        return $this->scopeConfig->getValue('payment/nectarpay/' . $field, \Magento\Store\Model\ScopeInterface::SCOPE_STORE);
    }

    private function configBaseUrl($order)
    {
        return $order->getStore() ? $order->getStore()->getBaseUrl() : '';
    }

    public function createCsrfValidationException(RequestInterface $request): ?InvalidRequestException
    {
        return null;
    }

    public function validateForCsrf(RequestInterface $request): ?bool
    {
        return true;
    }
}

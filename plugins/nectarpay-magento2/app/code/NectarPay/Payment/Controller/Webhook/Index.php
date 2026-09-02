<?php
namespace NectarPay\Payment\Controller\Webhook;

use Magento\Framework\App\Action\HttpPostActionInterface;
use Magento\Framework\App\CsrfAwareActionInterface;
use Magento\Framework\App\RequestInterface;
use Magento\Framework\App\Request\InvalidRequestException;

/**
 * NectarPay webhook receiver.
 * Signature: X-TXCPay-Signature: t=<unix>,v1=HMAC-SHA256("<t>.<rawBody>", secret).
 * Settles the order on invoice.confirmed.
 */
class Index implements HttpPostActionInterface, CsrfAwareActionInterface
{
    private $request;
    private $scopeConfig;
    private $orderRepository;
    private $responseFactory;
    private $logger;

    public function __construct(
        \Magento\Framework\App\RequestInterface $request,
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig,
        \Magento\Sales\Api\OrderRepositoryInterface $orderRepository,
        \Magento\Framework\Controller\Result\RawFactory $responseFactory,
        \Psr\Log\LoggerInterface $logger
    ) {
        $this->request = $request;
        $this->scopeConfig = $scopeConfig;
        $this->orderRepository = $orderRepository;
        $this->responseFactory = $responseFactory;
        $this->logger = $logger;
    }

    public function execute()
    {
        $respond = function ($code, $msg) {
            $result = $this->responseFactory->create();
            $result->setHttpResponseCode($code);
            $result->setHeader('Content-Type', 'text/plain', true);
            $result->setContents($msg);
            return $result;
        };

        $raw = file_get_contents('php://input');
        $sig = (string) $this->request->getServer('HTTP_X_TXCPAY_SIGNATURE');
        $secret = $this->scopeConfig->getValue('payment/nectarpay/webhook_secret');

        if (!$secret || !$sig || !$raw) {
            return $respond(400, 'missing signature');
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
            return $respond(400, 'malformed signature');
        }
        if (abs(time() - (int) $t) > 300) {
            return $respond(401, 'stale timestamp');
        }
        if (!hash_equals(hash_hmac('sha256', $t . '.' . $raw, $secret), $v1)) {
            $this->logger->warning('NectarPay: webhook signature mismatch');
            return $respond(401, 'invalid signature');
        }

        $event = json_decode($raw, true);
        if (!$event || empty($event['type']) || empty($event['data'])) {
            return $respond(400, 'bad payload');
        }
        if ($event['type'] !== 'invoice.confirmed') {
            return $respond(200, 'ignored');
        }

        $incrementId = isset($event['data']['order_id']) ? (string) $event['data']['order_id'] : '';
        $invId = isset($event['data']['invoice_id']) ? (string) $event['data']['invoice_id'] : '';
        if (!$incrementId) {
            return $respond(400, 'missing order_id');
        }

        try {
            /** @var \Magento\Sales\Model\Order $order */
            $order = $this->orderRepository->get((int) $this->loadOrderIdByIncrementId($incrementId));
        } catch (\Exception $e) {
            return $respond(404, 'order not found');
        }

        // Idempotency — webhooks can be retried.
        if ($order->getState() === \Magento\Sales\Model\Order::STATE_PROCESSING
            || $order->getState() === \Magento\Sales\Model\Order::STATE_COMPLETE) {
            return $respond(200, 'already recorded');
        }

        $payment = $order->getPayment();
        $payment->setLastTransId($invId);
        $order->setState(\Magento\Sales\Model\Order::STATE_PROCESSING);
        $order->setStatus('processing');
        $order->addCommentToStatusHistory('NectarPay payment confirmed on-chain. Invoice ' . $invId);
        $this->orderRepository->save($order);

        return $respond(200, 'ok');
    }

    private function loadOrderIdByIncrementId($incrementId)
    {
        // OrderRepository::get needs the entity ID; resolve via the resource model.
        $objectManager = \Magento\Framework\App\ObjectManager::getInstance();
        $order = $objectManager->create(\Magento\Sales\Model\Order::class)->loadByIncrementId($incrementId);
        if (!$order->getId()) {
            throw new \Exception('Order not found: ' . $incrementId);
        }
        return $order->getId();
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

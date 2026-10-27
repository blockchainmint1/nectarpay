<?php

namespace nectarpay\craftcommerce\gateways;

use Craft;
use craft\commerce\base\Gateway;
use craft\commerce\base\RequestResponseInterface;
use craft\commerce\models\payments\BasePaymentForm;
use craft\commerce\models\Transaction;
use craft\web\Response as WebResponse;

/**
 * NectarPay (crypto) gateway — offsite redirect flow.
 *
 * Settings: apiKey (sk_live_…), webhookSecret, apiBase.
 * Webhook URL (set in the NectarPay dashboard):
 *   https://your-site.com/actions/nectarpay/webhook
 */
class NectarPayGateway extends Gateway
{
    public ?string $apiKey = null;
    public ?string $webhookSecret = null;
    public string $apiBase = 'https://app.nectar-pay.com';

    public static function displayName(): string
    {
        return 'NectarPay (crypto: BTC, TXC, stablecoins)';
    }

    public function getSettings(): array
    {
        return [
            'apiKey' => $this->apiKey,
            'webhookSecret' => $this->webhookSecret,
            'apiBase' => $this->apiBase,
        ];
    }

    public function populateRequest(array &$request, BasePaymentForm $paymentForm = null): void {}

    public function authorize(Transaction $transaction, BasePaymentForm $form): RequestResponseInterface
    {
        return $this->purchase($transaction, $form);
    }

    public function purchase(Transaction $transaction, BasePaymentForm $form): RequestResponseInterface
    {
        $order = $transaction->getOrder();
        $payload = [
            'amount' => (float) $transaction->paymentAmount,
            'currency' => $transaction->paymentCurrency,
            'order_id' => (string) $order->number,
            'description' => 'Order ' . $order->number,
            'redirect_url' => $order->returnUrl ?: Craft::$app->getSites()->getCurrentSite()->getBaseUrl(),
        ];

        $ch = curl_init(rtrim($this->apiBase, '/') . '/api/public/v1/invoices');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . Craft::parseEnv($this->apiKey),
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode((string) $body, true);
        if ($status >= 200 && $status < 300 && !empty($data['checkout_url'])) {
            return new NectarPayResponse($data['checkout_url']);
        }

        return new NectarPayResponse(null, 'Could not start a crypto payment (HTTP ' . $status . ')');
    }

    public function completePurchase(Transaction $transaction): RequestResponseInterface
    {
        // Settlement happens via webhook; treat return as still pending.
        return new NectarPayResponse(null, 'Awaiting on-chain confirmation', true);
    }

    public function supportsAuthorize(): bool { return false; }
    public function supportsCapture(): bool { return false; }
    public function supportsPurchase(): bool { return true; }
    public function supportsRefund(): bool { return false; }
    public function supportsPartialRefund(): bool { return false; }
    public function supportsCompletePurchase(): bool { return true; }
    public function supportsWebhooks(): bool { return false; }
    public function supportsPaymentSources(): bool { return false; }
}

class NectarPayResponse implements RequestResponseInterface
{
    private ?string $redirectUrl;
    private string $message;
    private bool $processing;

    public function __construct(?string $redirectUrl, string $message = '', bool $processing = false)
    {
        $this->redirectUrl = $redirectUrl;
        $this->message = $message;
        $this->processing = $processing;
    }

    public function isSuccessful(): bool { return $this->redirectUrl !== null && !$this->processing; }
    public function isProcessing(): bool { return $this->processing; }
    public function isRedirect(): bool { return $this->redirectUrl !== null; }
    public function getRedirectMethod(): string { return 'GET'; }
    public function getRedirectData(): array { return []; }
    public function getRedirectUrl(): string { return (string) $this->redirectUrl; }
    public function getTransactionReference(): string { return ''; }
    public function getCode(): string { return ''; }
    public function getMessage(): string { return $this->message; }
    public function getData(): mixed { return null; }
    public function redirect(): WebResponse { return Craft::$app->getResponse()->redirect($this->redirectUrl); }
}

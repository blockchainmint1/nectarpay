<?php
/**
 * NectarPay payment gateway for WHMCS.
 *
 * Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Creates a
 * NectarPay invoice via REST and redirects the client to the hosted pay page.
 * A signed webhook (callback/nectarpay.php) marks the WHMCS invoice paid.
 *
 * Install: copy this file to modules/gateways/nectarpay.php and
 * callback/nectarpay.php to modules/gateways/callback/nectarpay.php, then
 * enable under Setup (wrench icon) → Apps & Integrations → Payment Gateways.
 */

if (!defined('WHMCS')) {
    die('This file cannot be accessed directly');
}

function nectarpay_MetaData()
{
    return [
        'DisplayName' => 'NectarPay (crypto: BTC, TXC, stablecoins)',
        'APIVersion' => '1.1',
        'DisableLocalCreditCardInput' => true,
        'TokenisedStorage' => false,
    ];
}

function nectarpay_config()
{
    return [
        'FriendlyName' => ['Type' => 'System', 'Value' => 'NectarPay'],
        'apiKey' => [
            'FriendlyName' => 'API key',
            'Type' => 'password',
            'Size' => '48',
            'Description' => 'sk_live_… from NectarPay Dashboard → API keys',
        ],
        'webhookSecret' => [
            'FriendlyName' => 'Webhook secret',
            'Type' => 'password',
            'Size' => '48',
            'Description' => 'NectarPay Dashboard → Webhooks → Signing secret.',
        ],
        'apiBase' => [
            'FriendlyName' => 'API base URL',
            'Type' => 'text',
            'Size' => '48',
            'Default' => 'https://app.nectar-pay.com',
        ],
    ];
}

function nectarpay_link($params)
{
    $apiBase = rtrim($params['apiBase'] ?: 'https://app.nectar-pay.com', '/');
    $systemUrl = rtrim($params['systemurl'], '/');

    $payload = [
        'amount' => (float) $params['amount'],
        'currency' => $params['currency'],
        'order_id' => (string) $params['invoiceid'],
        'description' => 'WHMCS invoice #' . $params['invoiceid'],
        'redirect_url' => $systemUrl . '/viewinvoice.php?id=' . (int) $params['invoiceid'],
    ];

    $ch = curl_init($apiBase . '/api/public/v1/invoices');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $params['apiKey'],
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode((string) $body, true);
    if ($status >= 200 && $status < 300 && !empty($data['checkout_url'])) {
        $url = $data['checkout_url'];
        $label = 'Pay with crypto (BTC, TXC, stablecoins)';
        return '<form method="get" action="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">'
            . '<button type="submit" class="btn btn-primary">' . $label . '</button></form>';
    }

    logTransaction('NectarPay', ['status' => $status, 'body' => $body], 'Invoice create failed');
    return '<div class="alert alert-danger">Could not start a crypto payment. Please try another payment method.</div>';
}

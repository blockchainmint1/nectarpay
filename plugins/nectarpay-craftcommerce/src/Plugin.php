<?php
/**
 * NectarPay gateway plugin for Craft Commerce 4/5.
 *
 * Non-custodial crypto payments (BTC, TEXITcoin, stablecoins). Shopper is
 * redirected to the hosted NectarPay pay page; a signed webhook completes
 * the order.
 */

namespace nectarpay\craftcommerce;

use craft\base\Plugin as BasePlugin;
use craft\commerce\services\Gateways;
use craft\events\RegisterComponentTypesEvent;
use nectarpay\craftcommerce\gateways\NectarPayGateway;
use yii\base\Event;

class Plugin extends BasePlugin
{
    public string $schemaVersion = '1.0.0';

    public function init(): void
    {
        parent::init();
        Event::on(
            Gateways::class,
            Gateways::EVENT_REGISTER_GATEWAY_TYPES,
            function (RegisterComponentTypesEvent $event) {
                $event->types[] = NectarPayGateway::class;
            }
        );
    }
}

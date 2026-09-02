<?php
namespace NectarPay\Payment\Model;

/**
 * NectarPay payment method — places the order, then the shopper is redirected
 * to the hosted NectarPay pay page. The signed webhook invoices the order.
 */
class NectarPay extends \Magento\Payment\Model\Method\AbstractMethod
{
    const CODE = 'nectarpay';

    protected $_code = self::CODE;
    protected $_isOffline = true;
    protected $_canOrder = true;
    protected $_canCapture = false;
    protected $_canRefund = false;
}

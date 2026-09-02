define([
    'jquery',
    'Magento_Checkout/js/view/payment/default',
    'mage/url'
], function ($, Component, url) {
    'use strict';

    return Component.extend({
        defaults: {
            template: 'NectarPay_Payment/payment/nectarpay'
        },
        redirectAfterPlaceOrder: false,

        afterPlaceOrder: function () {
            $.mage.redirect(url.build('nectarpay/redirect'));
        }
    });
});

<?php
/**
 * Removes plugin settings when the plugin is deleted from WordPress.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('woocommerce_nectarpay_settings');

<?php
/**
 * Removes the plugin's option and cached answers.
 *
 * @package superduperbundle-game-prices
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'sdbgp_api_key' );
global $wpdb;
// Cached lookups are transients named sdbgp_<md5> (and _last copies).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_sdbgp\\_%' OR option_name LIKE '\\_transient\\_timeout\\_sdbgp\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

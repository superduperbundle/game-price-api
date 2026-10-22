<?php
/**
 * Plugin Name:       SuperDuperBundle Game Prices
 * Plugin URI:        https://superduperbundle.com/tools/wordpress/
 * Description:       Show the lowest listed PC game key price for any game in posts and pages, with a link to the full price comparison. Shortcode [sdb_price game="Elden Ring"] and a block.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            SuperDuperBundle
 * Author URI:        https://superduperbundle.com/
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       superduperbundle-game-prices
 *
 * Prices come from the free SuperDuperBundle Game Price API (https://superduperbundle.com/tools/api/): only the game
 * name or Steam app ID written in the shortcode or block is sent; answers are cached for 6 hours.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SDBGP_VERSION', '1.0.0' );
define( 'SDBGP_API', 'https://superduperbundle.com/api/v1/lookup/' );
define( 'SDBGP_CACHE', 6 * HOUR_IN_SECONDS );

/**
 * One lookup: a game name or a Steam app ID -> the first result of the API, or null.
 * Cached for 6 hours; the last good answer is kept 7 days and shown if the API cannot be reached.
 *
 * @param string $game     Game name.
 * @param string $steam_id Steam app ID (digits).
 * @return array|null
 */
function sdbgp_lookup( $game, $steam_id ) {
	$steam_id = preg_replace( '/\D/', '', (string) $steam_id );
	$game     = trim( wp_strip_all_tags( (string) $game ) );
	if ( '' !== $steam_id ) {
		$args = array( 'steam_id' => $steam_id );
	} elseif ( strlen( $game ) >= 2 ) {
		$args = array(
			'q'     => substr( $game, 0, 80 ),
			'limit' => 1,
		);
	} else {
		return null;
	}
	$args['client'] = 'wordpress';
	$key            = 'sdbgp_' . md5( wp_json_encode( $args ) );
	$cached         = get_transient( $key );
	if ( false !== $cached ) {
		return is_array( $cached ) ? $cached : null;
	}

	$headers = array( 'Accept' => 'application/json' );
	$api_key = get_option( 'sdbgp_api_key', '' );
	if ( is_string( $api_key ) && preg_match( '/^sdb_[A-Za-z0-9_-]{16,}$/', $api_key ) ) {
		$headers['X-API-Key'] = $api_key;
	}
	$response = wp_remote_get(
		add_query_arg( $args, SDBGP_API ),
		array(
			'timeout' => 8,
			'headers' => $headers,
		)
	);
	$code = is_wp_error( $response ) ? 0 : (int) wp_remote_retrieve_response_code( $response );
	if ( 200 !== $code ) {
		$stale = get_transient( $key . '_last' );
		set_transient( $key, is_array( $stale ) ? $stale : 'none', 15 * MINUTE_IN_SECONDS );
		return is_array( $stale ) ? $stale : null;
	}
	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	$game = ( is_array( $body ) && ! empty( $body['results'][0] ) && is_array( $body['results'][0] ) ) ? $body['results'][0] : null;
	set_transient( $key, $game ? $game : 'none', SDBGP_CACHE );
	if ( $game ) {
		set_transient( $key . '_last', $game, 7 * DAY_IN_SECONDS );
	}
	return $game;
}

/**
 * Formats a US-dollar amount.
 *
 * @param mixed $n Amount.
 * @return string
 */
function sdbgp_money( $n ) {
	return '$' . number_format( (float) $n, 2 );
}

/**
 * The price box. Shown to visitors only when a game was found; editors also see why nothing is shown.
 *
 * @param array $atts game, steam_id, offers (0-3).
 * @return string
 */
function sdbgp_render( $atts ) {
	$atts   = shortcode_atts(
		array(
			'game'     => '',
			'steam_id' => '',
			'offers'   => 0,
		),
		$atts,
		'sdb_price'
	);
	$g      = sdbgp_lookup( $atts['game'], $atts['steam_id'] );
	$offers = max( 0, min( 3, (int) $atts['offers'] ) );
	if ( ! $g ) {
		if ( current_user_can( 'edit_posts' ) ) {
			/* translators: %s: the game name or Steam app ID written in the shortcode or block. */
			return '<p class="sdbgp-notice">' . esc_html( sprintf( __( 'SuperDuperBundle: no game found for "%s" (only editors see this message).', 'superduperbundle-game-prices' ), $atts['game'] ? $atts['game'] : $atts['steam_id'] ) ) . '</p>';
		}
		return '';
	}
	wp_enqueue_style( 'sdbgp' );

	$name   = isset( $g['name'] ) ? (string) $g['name'] : '';
	$url    = isset( $g['url'] ) ? (string) $g['url'] : 'https://superduperbundle.com/';
	$state  = isset( $g['state'] ) ? (string) $g['state'] : '';
	$stores = isset( $g['store_count'] ) ? (int) $g['store_count'] : 0;
	$low    = ( isset( $g['lowest'] ) && is_array( $g['lowest'] ) ) ? $g['lowest'] : null;

	$out  = '<div class="sdbgp-box">';
	$out .= '<div class="sdbgp-name">' . esc_html( $name ) . '</div>';
	if ( 'price' === $state && $low ) {
		$out .= '<div class="sdbgp-price">' . esc_html( sdbgp_money( $low['price'] ) ) . '</div>';
		$meta = sprintf(
			/* translators: %s: store name. */
			__( 'Lowest listed price at %s', 'superduperbundle-game-prices' ),
			isset( $low['store_name'] ) ? $low['store_name'] : ''
		);
		if ( $stores >= 2 ) {
			/* translators: %d: number of stores compared. */
			$meta .= ' · ' . sprintf( _n( '%d store compared', '%d stores compared', $stores, 'superduperbundle-game-prices' ), $stores );
		}
		if ( ! empty( $low['discount_pct'] ) && ! empty( $g['list_price'] ) ) {
			/* translators: 1: discount percent, 2: Steam's regular price. */
			$meta .= ' · ' . sprintf( __( '%1$d%% below Steam’s regular %2$s', 'superduperbundle-game-prices' ), (int) $low['discount_pct'], sdbgp_money( $g['list_price'] ) );
		}
		if ( ! empty( $low['checked_at'] ) ) {
			/* translators: %s: date the price was checked. */
			$meta .= ' · ' . sprintf( __( 'checked %s', 'superduperbundle-game-prices' ), date_i18n( get_option( 'date_format' ), strtotime( $low['checked_at'] ) ) );
		}
		$out .= '<div class="sdbgp-meta">' . esc_html( $meta ) . '</div>';
		if ( $offers > 0 && ! empty( $g['offers'] ) && is_array( $g['offers'] ) ) {
			$more = array_slice( $g['offers'], 1, $offers );
			if ( $more ) {
				$out .= '<ul class="sdbgp-offers">';
				foreach ( $more as $o ) {
					$out .= '<li>' . esc_html( ( isset( $o['store_name'] ) ? $o['store_name'] : '' ) . ': ' . sdbgp_money( isset( $o['price'] ) ? $o['price'] : 0 ) ) . '</li>';
				}
				$out .= '</ul>';
			}
		}
		/* translators: %d: number of stores compared. */
		$label = $stores >= 2 ? sprintf( __( 'Compare all %d stores', 'superduperbundle-game-prices' ), $stores ) : __( 'View prices', 'superduperbundle-game-prices' );
	} else {
		$text  = 'free' === $state ? __( 'Free to play.', 'superduperbundle-game-prices' ) : ( 'unreleased' === $state ? __( 'Not released yet.', 'superduperbundle-game-prices' ) : __( 'Not on sale at the stores SuperDuperBundle compares.', 'superduperbundle-game-prices' ) );
		$out  .= '<div class="sdbgp-meta">' . esc_html( $text ) . '</div>';
		$label = __( 'View prices', 'superduperbundle-game-prices' );
	}
	$out .= '<a class="sdbgp-link" href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . esc_html( $label ) . '</a>';
	$out .= '<div class="sdbgp-note">' . esc_html__( 'Prices by SuperDuperBundle. Listed prices in US dollars; stores set fees and the final total at checkout.', 'superduperbundle-game-prices' ) . '</div>';
	$out .= '</div>';
	return $out;
}

/**
 * Registers the stylesheet, the shortcode and the block.
 */
function sdbgp_init() {
	wp_register_style( 'sdbgp', plugins_url( 'assets/style.css', __FILE__ ), array(), SDBGP_VERSION );
	add_shortcode( 'sdb_price', 'sdbgp_render' );
	wp_register_script( 'sdbgp-block', plugins_url( 'assets/block.js', __FILE__ ), array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render', 'wp-i18n' ), SDBGP_VERSION, true );
	register_block_type(
		'superduperbundle/game-price',
		array(
			'api_version'     => 2,
			'editor_script'   => 'sdbgp-block',
			'style'           => 'sdbgp',
			'attributes'      => array(
				'game'    => array(
					'type'    => 'string',
					'default' => '',
				),
				'steamId' => array(
					'type'    => 'string',
					'default' => '',
				),
				'offers'  => array(
					'type'    => 'number',
					'default' => 0,
				),
			),
			'render_callback' => function ( $a ) {
				return sdbgp_render(
					array(
						'game'     => isset( $a['game'] ) ? $a['game'] : '',
						'steam_id' => isset( $a['steamId'] ) ? $a['steamId'] : '',
						'offers'   => isset( $a['offers'] ) ? $a['offers'] : 0,
					)
				);
			},
		)
	);
}
add_action( 'init', 'sdbgp_init' );

/**
 * Settings: an optional free API key (higher rate limit). Nothing else is stored.
 */
function sdbgp_admin_init() {
	register_setting(
		'sdbgp',
		'sdbgp_api_key',
		array(
			'type'              => 'string',
			'sanitize_callback' => function ( $v ) {
				$v = trim( (string) $v );
				return preg_match( '/^sdb_[A-Za-z0-9_-]{16,}$/', $v ) ? $v : '';
			},
			'default'           => '',
		)
	);
}
add_action( 'admin_init', 'sdbgp_admin_init' );

/**
 * Adds Settings > SuperDuperBundle.
 */
function sdbgp_admin_menu() {
	add_options_page( 'SuperDuperBundle', 'SuperDuperBundle', 'manage_options', 'sdbgp', 'sdbgp_settings_page' );
}
add_action( 'admin_menu', 'sdbgp_admin_menu' );

/**
 * The settings page.
 */
function sdbgp_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'SuperDuperBundle Game Prices', 'superduperbundle-game-prices' ) . '</h1>';
	echo '<p>' . esc_html__( 'Use the shortcode [sdb_price game="Elden Ring"] or [sdb_price steam_id="1245620"] (add offers="3" to list other stores), or the "Game price" block.', 'superduperbundle-game-prices' ) . '</p>';
	echo '<form method="post" action="options.php">';
	settings_fields( 'sdbgp' );
	echo '<table class="form-table"><tr><th scope="row"><label for="sdbgp_api_key">' . esc_html__( 'API key (optional)', 'superduperbundle-game-prices' ) . '</label></th><td>';
	echo '<input type="text" class="regular-text" id="sdbgp_api_key" name="sdbgp_api_key" value="' . esc_attr( get_option( 'sdbgp_api_key', '' ) ) . '" autocomplete="off">';
	echo '<p class="description">' . wp_kses_post( __( 'Not needed for most sites. A free key from <a href="https://superduperbundle.com/tools/api/#keys" target="_blank" rel="noopener">superduperbundle.com</a> raises the rate limit.', 'superduperbundle-game-prices' ) ) . '</p>';
	echo '</td></tr></table>';
	submit_button();
	echo '</form></div>';
}

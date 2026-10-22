/* "Game price" block: the editor shows the live price box (server-side render) and two fields in the sidebar. */
( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var PanelBody = wp.components.PanelBody;
	var TextControl = wp.components.TextControl;
	var RangeControl = wp.components.RangeControl;
	var ServerSideRender = wp.serverSideRender;

	wp.blocks.registerBlockType( 'superduperbundle/game-price', {
		apiVersion: 2,
		title: __( 'Game price', 'superduperbundle-game-prices' ),
		description: __( 'The lowest listed PC key price for a game, with a link to the full comparison on SuperDuperBundle.', 'superduperbundle-game-prices' ),
		icon: 'tag',
		category: 'widgets',
		keywords: [ 'game', 'price', 'steam', 'deal' ],
		attributes: {
			game: { type: 'string', default: '' },
			steamId: { type: 'string', default: '' },
			offers: { type: 'number', default: 0 }
		},
		edit: function ( props ) {
			var a = props.attributes;
			var set = props.setAttributes;
			return el(
				'div',
				useBlockProps(),
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Game', 'superduperbundle-game-prices' ) },
						el( TextControl, { label: __( 'Game name', 'superduperbundle-game-prices' ), value: a.game, onChange: function ( v ) { set( { game: v } ); } } ),
						el( TextControl, { label: __( 'or Steam app ID', 'superduperbundle-game-prices' ), value: a.steamId, onChange: function ( v ) { set( { steamId: v.replace( /\D/g, '' ) } ); } } ),
						el( RangeControl, { label: __( 'Other offers to list', 'superduperbundle-game-prices' ), min: 0, max: 3, value: a.offers, onChange: function ( v ) { set( { offers: v } ); } } )
					)
				),
				a.game || a.steamId
					? el( ServerSideRender, { block: 'superduperbundle/game-price', attributes: a } )
					: el( 'p', { className: 'sdbgp-notice' }, __( 'Enter a game name or Steam app ID in the block settings.', 'superduperbundle-game-prices' ) )
			);
		},
		save: function () {
			return null;
		}
	} );
} )( window.wp );

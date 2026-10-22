=== SuperDuperBundle Game Prices ===
Contributors: superduperbundle
Tags: games, steam, price comparison, game deals, shortcode
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Show the lowest listed PC game key price for any game in your posts, with a link to the full price comparison.

== Description ==

Writing about a game? Add its current price. This plugin shows a small price box with the **lowest listed PC key price** for a game across the official stores (Steam, GOG) and key stores that [SuperDuperBundle](https://superduperbundle.com/) compares, how far it is below Steam's regular price, how many stores were compared and when the price was checked, plus a link to the full comparison.

* Shortcode: `[sdb_price game="Elden Ring"]`, or by Steam app ID: `[sdb_price steam_id="1245620"]`. Add `offers="3"` to list up to three other stores.
* Block: "Game price" (search for it in the block inserter), with the game in the block settings.
* Prices are cached on your site for 6 hours; if the price service cannot be reached, the last good answer is shown.
* No account needed. An optional free API key (Settings > SuperDuperBundle) raises the rate limit for busy sites.

Prices are listed prices in US dollars as each store shows them; stores set fees and the final total at checkout. SuperDuperBundle compares prices and does not sell keys. SuperDuperBundle may earn a commission when visitors buy through store links on its website; this plugin itself links only to SuperDuperBundle's comparison pages.

== External services ==

This plugin connects to the SuperDuperBundle Game Price API (https://superduperbundle.com/api/v1/lookup/) to get game prices. It is needed to show any price.

* What is sent, and when: the game name or Steam app ID written in a shortcode or block, plus the label `client=wordpress`, each time a page with a price box is shown and no cached answer is available (answers are cached for 6 hours). If you add an API key in the settings, it is sent too. No visitor data is sent: the request comes from your server, not from the visitor's browser.
* Service terms: https://superduperbundle.com/tools/api/#terms
* Privacy policy: https://superduperbundle.com/privacy/

The price box links to the game's comparison page on superduperbundle.com (rel="nofollow").

== Installation ==

1. Install and activate the plugin.
2. Add `[sdb_price game="Your game"]` to a post, or insert the "Game price" block.
3. Optional: add a free API key under Settings > SuperDuperBundle.

== Frequently Asked Questions ==

= Which games are covered? =

PC games sold on Steam and GOG and by the key stores SuperDuperBundle compares. Names are matched like a search box ("rdr2" and "gta 5" work); a Steam app ID is exact.

= Why is nothing shown? =

When a game cannot be found, visitors see nothing and logged-in editors see a short notice explaining why.

= Which currency? =

US dollars, the prices as the stores list them for the United States.

== Changelog ==

= 1.0.1 =
* The "Compare" link in the price box is rel="nofollow" (a widget link should not pass ranking signals).

= 1.0.0 =
* First release: shortcode, block, 6-hour cache, optional API key.

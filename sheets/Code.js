/**
 * SuperDuperBundle for Google Sheets: live PC game key prices as spreadsheet formulas.
 * Data: the free SuperDuperBundle Game Price API (https://superduperbundle.com/tools/api/). Code: MIT.
 * Prices are US-dollar listed prices as each store shows them; stores set fees and the final total at checkout.
 * Sends only the game names / Steam app IDs used in the formulas. Stores nothing outside this spreadsheet.
 */

var API = 'https://superduperbundle.com/api/v1/lookup/';
var CACHE_SECONDS = 6 * 60 * 60; // answers are cached 6 hours (Sheets recalculates often)
var BATCH = 50;                   // the API takes up to 50 Steam app IDs per request
var FIELDS = { price: 'price', store: 'store', url: 'url', name: 'name', stores: 'stores', steam: 'steam', list: 'list', discount: 'discount', checked: 'checked' };

/** Menu for every spreadsheet that has the add-on. */
function onOpen(e) {
  SpreadsheetApp.getUi().createAddonMenu()
    .addItem('Look up a game', 'showSidebar')
    .addItem('How to use the formulas', 'showHelp')
    .addToUi();
}
function onInstall(e) { onOpen(e); }

/**
 * Lowest listed PC key price (US dollars) for a game, from the stores SuperDuperBundle compares.
 * Works on one cell or a whole range (one lookup request per 50 Steam IDs).
 *
 * @param {string|number|Array<Array<string|number>>} game A game name ("Elden Ring"), a Steam app ID (1245620) or a range of them.
 * @param {string} [field] What to return: "price" (default), "store", "url", "name", "stores", "steam" (Steam's price), "list" (Steam's regular price), "discount" (%), "checked" (date).
 * @return The value for each game; empty when the game is not found or not on sale.
 * @customfunction
 */
function GAMEPRICE(game, field) {
  var f = FIELDS[String(field || 'price').toLowerCase()];
  if (!f) throw new Error('field must be one of: ' + Object.keys(FIELDS).join(', '));
  if (Array.isArray(game)) {
    var flat = [];
    game.forEach(function (row) { row.forEach(function (v) { flat.push(v); }); });
    var games = lookupMany_(flat);
    var i = 0;
    return game.map(function (row) { return row.map(function () { return pick_(games[i++], f); }); });
  }
  return pick_(lookupMany_([game])[0], f);
}

/**
 * Store with the lowest listed PC key price for a game.
 * @param {string|number|Array<Array<string|number>>} game A game name, Steam app ID or a range of them.
 * @return The store name.
 * @customfunction
 */
function GAMESTORE(game) { return GAMEPRICE(game, 'store'); }

/**
 * Link to the full price comparison of a game on SuperDuperBundle.
 * @param {string|number|Array<Array<string|number>>} game A game name, Steam app ID or a range of them.
 * @return The compare page URL.
 * @customfunction
 */
function GAMEURL(game) { return GAMEPRICE(game, 'url'); }

function pick_(g, f) {
  if (!g) return '';
  var l = g.lowest;
  switch (f) {
    case 'name': return g.name;
    case 'url': return g.url;
    case 'stores': return g.store_count;
    case 'list': return g.list_price == null ? '' : g.list_price;
    case 'steam': {
      var s = (g.offers || []).filter(function (o) { return o.store === 'steam'; })[0];
      return s ? s.price : '';
    }
    case 'price': return l ? l.price : (g.state === 'free' ? 0 : '');
    case 'store': return l ? l.store_name : (g.state === 'free' ? 'Free to play' : '');
    case 'discount': return l && l.discount_pct ? l.discount_pct / 100 : '';
    case 'checked': return l && l.checked_at ? new Date(l.checked_at) : '';
  }
  return '';
}

/** One result per input (null when not found), using the cache and batching Steam IDs. */
function lookupMany_(inputs) {
  var cache = CacheService.getScriptCache();
  var keys = inputs.map(function (v) { return keyOf_(v); });
  var want = keys.filter(function (k, i) { return k && keys.indexOf(k) === i; });
  var found = {};
  var cached = want.length ? cache.getAll(want) : {};
  var missIds = [], missNames = [];
  want.forEach(function (k) {
    if (cached[k] !== undefined) { found[k] = cached[k] === 'null' ? null : JSON.parse(cached[k]); return; }
    if (k.indexOf('id:') === 0) missIds.push(k.slice(3)); else missNames.push(k);
  });
  var put = {};
  for (var b = 0; b < missIds.length; b += BATCH) {
    var ids = missIds.slice(b, b + BATCH);
    var r = fetch_({ steam_ids: ids.join(',') });
    var byId = {};
    (r && r.results || []).forEach(function (g) { byId[String(g.steam_app_id)] = g; });
    ids.forEach(function (id) {
      if (!r) return; // request failed: do not cache, try again next time
      var g = byId[id] ? slim_(byId[id]) : null;
      found['id:' + id] = g; put['id:' + id] = g ? JSON.stringify(g) : 'null';
    });
  }
  missNames.forEach(function (k) {
    var r = fetch_({ q: k.slice(2) });
    if (!r) return;
    var g = r.results && r.results[0] ? slim_(r.results[0]) : null;
    found[k] = g; put[k] = g ? JSON.stringify(g) : 'null';
  });
  if (Object.keys(put).length) cache.putAll(put, CACHE_SECONDS);
  return keys.map(function (k) { return k ? (found[k] === undefined ? null : found[k]) : null; });
}

/** "id:1245620" for a Steam app ID (number or digits), "q:elden ring" for a name, null for an empty cell. */
function keyOf_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var s = String(v).trim();
  if (!s) return null;
  if (/^\d{1,10}$/.test(s)) return 'id:' + s;
  var m = s.match(/store\.steampowered\.com\/app\/(\d+)/);
  if (m) return 'id:' + m[1];
  return 'q:' + s.toLowerCase().slice(0, 80);
}

/** Only the fields the formulas read (Cache values are limited to 100 KB each). */
function slim_(g) {
  return { name: g.name, url: g.url, state: g.state, steam_app_id: g.steam_app_id, list_price: g.list_price, store_count: g.store_count,
    lowest: g.lowest ? { price: g.lowest.price, store_name: g.lowest.store_name, discount_pct: g.lowest.discount_pct, checked_at: g.lowest.checked_at } : null,
    offers: (g.offers || []).map(function (o) { return { store: o.store, store_name: o.store_name, price: o.price, drm: o.drm, region: o.region }; }) };
}

function fetch_(params) {
  var qs = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  var res = UrlFetchApp.fetch(API + '?' + qs + '&client=google-sheets', { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
  if (res.getResponseCode() === 429) throw new Error('SuperDuperBundle: too many lookups right now. Try again in a few minutes.');
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

// ---- sidebar
function showSidebar() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('SuperDuperBundle'));
}
function showHelp() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px/1.5 Arial,sans-serif">' +
    '<p><b>=GAMEPRICE("Elden Ring")</b> lowest listed PC key price in US dollars.</p>' +
    '<p><b>=GAMEPRICE(1245620)</b> the same by Steam app ID; <b>=GAMEPRICE(A2:A50)</b> a whole column at once.</p>' +
    '<p><b>=GAMEPRICE(A2, "store")</b> also: "url", "name", "stores", "steam", "list", "discount", "checked".</p>' +
    '<p><b>=GAMESTORE(A2)</b>, <b>=GAMEURL(A2)</b> shortcuts. Answers refresh every 6 hours.</p>' +
    '<p>Prices are listed prices as each store shows them; stores set fees and the final total at checkout. ' +
    'Prices by <a href="https://superduperbundle.com/tools/sheets/" target="_blank">SuperDuperBundle</a>.</p></div>')
    .setWidth(460).setHeight(280);
  SpreadsheetApp.getUi().showModalDialog(html, 'How to use SuperDuperBundle');
}
/** Called by the sidebar: one game with its offers. */
function sidebarLookup(query) {
  var k = keyOf_(query);
  if (!k) return null;
  var r = fetch_(k.indexOf('id:') === 0 ? { steam_id: k.slice(3) } : { q: k.slice(2), limit: 3 });
  return r ? r.results : null;
}
/** Called by the sidebar: writes a GAMEPRICE formula for the game into the selected cell. */
function insertFormula(game) {
  var cell = SpreadsheetApp.getActiveRange();
  if (cell) cell.setFormula('=GAMEPRICE(' + (/^\d+$/.test(String(game)) ? game : JSON.stringify(String(game))) + ')');
}

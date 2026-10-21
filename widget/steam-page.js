// Steam store page adapter shared by the userscript and the extension: which app the page is, where the badge goes, and
// the price Steam itself shows the visitor (in US dollars only; any other currency = unknown).
globalThis.sdbSteamAppId = (loc) => { const m = loc.pathname.match(/^\/app\/(\d+)/); return m ? m[1] : null; };

/** The base game's price on this Steam page when Steam shows it in US dollars ("$39.99", "$39.99 USD"); else null. */
globalThis.sdbSteamUsd = (root) => {
  const el = root.querySelector('.game_area_purchase_game_wrapper .discount_final_price, .game_area_purchase_game_wrapper .game_purchase_price, .discount_final_price, .game_purchase_price');
  const t = el && el.textContent.trim();
  const m = t && t.match(/^\$\s?(\d+(?:[.,]\d{2})?)(?:\s*USD)?$/);
  return m ? Number(m[1].replace(',', '.')) : null;
};

/** Puts the badge above the purchase area (once). Returns true when it is shown. */
globalThis.sdbMountOnSteam = (doc, game) => {
  const anchor = doc.querySelector('#game_area_purchase') || doc.querySelector('.game_area_purchase_game_wrapper');
  if (!anchor || doc.querySelector('[data-sdb-badge]')) return false;
  const host = doc.createElement('div');
  host.setAttribute('data-sdb-badge', '');
  host.style.margin = '0 0 12px';
  anchor.parentNode.insertBefore(host, anchor);
  return globalThis.sdbRenderPrice(host, game, { theme: 'dark', localUsd: globalThis.sdbSteamUsd(anchor) });
};

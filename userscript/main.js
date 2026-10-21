// Userscript body (build.mjs puts the header + widget/sdb-price.js in front). Steam app pages: one <sdb-price> badge above
// the purchase area with the lowest listed key price from SuperDuperBundle. One API call per page, answers cached in
// localStorage for 15 minutes, silent on any error or rate limit (no badge, no console noise).
const API = 'https://superduperbundle.com/api/v1/lookup/';
const TTL = 15 * 60 * 1000;

function get(url) {
  return new Promise((resolve) => {
    const gm = typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null;
    if (!gm) return resolve(null);
    gm({ method: 'GET', url, headers: { Accept: 'application/json' }, timeout: 10000,
      onload: (r) => { try { resolve(r.status === 200 ? JSON.parse(r.responseText) : null); } catch { resolve(null); } },
      onerror: () => resolve(null), ontimeout: () => resolve(null) });
  });
}

async function game(appId) {
  const k = `sdb:${appId}`;
  try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && Date.now() - c.at < TTL) return c.g; } catch { /* storage blocked */ }
  const r = await get(`${API}?steam_id=${appId}&client=userscript`);
  const g = r && r.results && r.results[0] || null;
  try { localStorage.setItem(k, JSON.stringify({ at: Date.now(), g })); } catch { /* storage blocked */ }
  return g;
}

/** The base game's price on this Steam page when Steam shows it in US dollars ("$39.99", "$39.99 USD"); else null. */
function steamUsd(root) {
  const el = root.querySelector('.game_area_purchase_game_wrapper .discount_final_price, .game_area_purchase_game_wrapper .game_purchase_price, .discount_final_price, .game_purchase_price');
  const t = el && el.textContent.trim();
  const m = t && t.match(/^\$\s?(\d+(?:[.,]\d{2})?)(?:\s*USD)?$/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

(async () => {
  const m = location.pathname.match(/^\/app\/(\d+)/);
  if (!m) return;
  const g = await game(m[1]);
  if (!g) return;
  const anchor = document.querySelector('#game_area_purchase') || document.querySelector('.game_area_purchase_game_wrapper') || document.querySelector('.page_content_ctn .rightcol');
  if (!anchor) return;
  const el = document.createElement('sdb-price');
  el.style.margin = '0 0 12px';
  el.setAttribute('theme', 'dark');   // Steam's store is dark
  const local = steamUsd(anchor);
  if (local !== null) el.localUsd = local;
  anchor.parentNode.insertBefore(el, anchor);
  el.data = g;
})();

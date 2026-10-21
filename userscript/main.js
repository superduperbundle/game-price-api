// Userscript body (build.mjs puts the header + widget/sdb-price.js in front). Steam app pages: one badge above the purchase
// area with the lowest listed key price from SuperDuperBundle. One API call per page, answers cached in localStorage for
// 15 minutes, silent on any error or rate limit (no badge, no console noise). Page logic shared with the extension: steam-page.js.
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
  if (!r) return null;   // error or rate limit: no badge, not cached (next page view tries again)
  const g = (r.results && r.results[0]) || null;
  try { localStorage.setItem(k, JSON.stringify({ at: Date.now(), g })); } catch { /* storage blocked */ }
  return g;
}

(async () => {
  const appId = sdbSteamAppId(location);
  if (!appId) return;
  const g = await game(appId);
  if (g) sdbMountOnSteam(document, g);
})();

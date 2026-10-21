// UI kernel shared by every visual shell (userscript, browser extension, embeds, OBS): one game's lowest listed price from
// the SuperDuperBundle API, drawn in a shadow root so page styles cannot break it.
//   globalThis.sdbRenderPrice(host, game, { theme, localUsd }) -> true when shown   (any element; used by the extension,
//                                                     whose content scripts have no customElements in Chrome)
//   <sdb-price theme="light|dark">, el.localUsd = n, el.data = game                 (pages and userscripts)
// game = one result of /api/v1/lookup/; the shell fetches it with its own transport.
// Nothing is shown for games with no price, when the only price is Steam's own, or when the visitor's own store page
// already shows a US-dollar price at or below ours (regional pricing: our prices are US prices).
// Code: MIT. Data shown under the API terms: the badge always carries the visible "SuperDuperBundle" link.
(() => {
  if (globalThis.sdbRenderPrice) return;
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ago = (iso) => {
    if (!iso) return '';
    const h = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));
    return h < 1 ? 'checked within the hour' : h < 48 ? `checked ${h} h ago` : `checked ${Math.round(h / 24)} days ago`;
  };
  const DARK = '--bg:#141A2E; --ink:#E8ECF6; --ink2:#A3ACC2; --line:#2A3350; --accent:#8C9DFF; --mint:#4FD39F; --on:#0B1020;';
  const CSS = `
    :host { all: initial; display: block; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    .box { --bg:#fff; --ink:#10162B; --ink2:#5A6378; --line:#DDE2EC; --accent:#2F4BFF; --mint:#0B8F5E; --on:#fff;
      background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; }
    .box.dark { ${DARK} }
    @media (prefers-color-scheme: dark) { .box.auto { ${DARK} } }
    .price { font-weight:800; font-size:18px; color:var(--mint); font-variant-numeric: tabular-nums; }
    .what { flex:1 1 220px; min-width:0; }
    .sub { color:var(--ink2); font-size:12px; }
    a.go { color:var(--on); background:var(--accent); text-decoration:none; font-weight:700; padding:7px 12px; border-radius:8px; white-space:nowrap; }
    a.brand { color:var(--ink2); }
    .off { font-weight:700; color:var(--mint); }
  `;
  function render(host, g, opts = {}) {
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const l = g && g.lowest;
    const local = typeof opts.localUsd === 'number' ? opts.localUsd : null;
    const worth = !!(g && g.state === 'price' && l && !(g.store_count < 2 && l.store === 'steam') && !(local !== null && local <= l.price));
    host.hidden = !worth;
    if (!worth) { root.innerHTML = ''; return false; }
    const theme = opts.theme === 'dark' || opts.theme === 'light' ? opts.theme : 'auto';
    const steamKey = g.lowest_steam_key && g.lowest_steam_key.store !== l.store ? `<div class="sub">Cheapest Steam key: ${money(g.lowest_steam_key.price)} at ${esc(g.lowest_steam_key.store_name)}</div>` : '';
    const what = g.store_count >= 2
      ? `Lowest listed US price at ${esc(l.store_name)} <span class="sub">(${esc(l.drm || 'PC')} key, ${esc(l.region || 'region not stated')})</span>`
      : `US price at ${esc(l.store_name)} <span class="sub">(${esc(l.drm || 'PC')} key)</span>`;
    root.innerHTML = `<style>${CSS}</style>
      <div class="box ${theme}" part="box">
        <span class="price">${money(l.price)}</span>${l.discount_pct ? ` <span class="off">−${l.discount_pct}%</span>` : ''}
        <div class="what">${what}${steamKey}
          <div class="sub">${g.store_count >= 2 ? `${g.store_count} stores compared · ` : ''}${ago(l.checked_at)} · prices by <a class="brand" href="https://superduperbundle.com/" target="_blank" rel="noopener">SuperDuperBundle</a>, which may earn a commission from store links</div>
        </div>
        <a class="go" href="${esc(g.url)}" target="_blank" rel="noopener">${g.store_count >= 2 ? 'Compare prices' : 'View prices'}</a>
      </div>`;
    return true;
  }
  globalThis.sdbRenderPrice = render;
  if (typeof customElements !== 'undefined' && customElements && !customElements.get('sdb-price')) {
    customElements.define('sdb-price', class extends HTMLElement {
      set data(g) { this._data = g; render(this, g, { theme: this.getAttribute('theme'), localUsd: this.localUsd }); }
      get data() { return this._data; }
    });
  }
})();

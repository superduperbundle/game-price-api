// <sdb-price> web component: the UI kernel every visual shell reuses (userscript, browser extension, embeds, OBS).
// Renders one game's lowest listed price from the SuperDuperBundle API in a shadow root (page styles cannot break it).
// Data in: el.data = <Game from /api/v1/lookup/>  (the shell fetches, so each shell can use its own transport:
// GM.xmlHttpRequest in a userscript, the extension's background worker, plain fetch on a web page).
// Attributes: theme="light|dark|auto" (default auto), compact (one line).
// Shows nothing for games with no price, and nothing when the only price is Steam's own (no comparison to offer).
// Code: MIT. Data shown under the API terms: the badge always carries the visible "SuperDuperBundle" link.
(() => {
  if (typeof customElements === 'undefined' || customElements.get('sdb-price')) return;
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ago = (iso) => {
    if (!iso) return '';
    const h = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));
    return h < 1 ? 'checked within the hour' : h < 48 ? `checked ${h} h ago` : `checked ${Math.round(h / 24)} days ago`;
  };
  const CSS = `
    :host { all: initial; display: block; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    :host([hidden]) { display: none; }
    .box { --bg:#fff; --ink:#10162B; --ink2:#5A6378; --line:#DDE2EC; --accent:#2F4BFF; --mint:#0B8F5E;
      background:var(--bg); color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:10px 12px; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; }
    :host([theme=dark]) .box, .dark { --bg:#141A2E; --ink:#E8ECF6; --ink2:#A3ACC2; --line:#2A3350; --accent:#8C9DFF; --mint:#4FD39F; }
    @media (prefers-color-scheme: dark) { :host(:not([theme=light])) .box { --bg:#141A2E; --ink:#E8ECF6; --ink2:#A3ACC2; --line:#2A3350; --accent:#8C9DFF; --mint:#4FD39F; } }
    .price { font-weight:800; font-size:18px; color:var(--mint); font-variant-numeric: tabular-nums; }
    .what { flex:1 1 220px; min-width:0; }
    .sub { color:var(--ink2); font-size:12px; }
    a.go { color:#fff; background:var(--accent); text-decoration:none; font-weight:700; padding:7px 12px; border-radius:8px; white-space:nowrap; }
    :host([theme=dark]) a.go { color:#0B1020; }
    a.brand { color:var(--ink2); }
    .off { font-weight:700; color:var(--mint); }
  `;
  class SdbPrice extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._data = null; }
    set data(g) { this._data = g; this.render(); }
    get data() { return this._data; }
    render() {
      const g = this._data, l = g && g.lowest;
      // localUsd: the price the visitor's own store page shows, in US dollars, when the shell can read it. Our prices are
      // US prices; with regional pricing (Steam in MENA, Latin America...) the visitor's local price can be lower: then
      // the badge would advertise a worse deal, so it stays hidden.
      const local = typeof this.localUsd === 'number' ? this.localUsd : null;
      const worth = g && g.state === 'price' && l && !(g.store_count < 2 && l.store === 'steam') && !(local !== null && local <= l.price);
      this.hidden = !worth;
      if (!worth) { this.shadowRoot.innerHTML = ''; return; }
      const steamKey = g.lowest_steam_key && g.lowest_steam_key.store !== l.store ? `<div class="sub">Cheapest Steam key: ${money(g.lowest_steam_key.price)} at ${esc(g.lowest_steam_key.store_name)}</div>` : '';
      const what = g.store_count >= 2
        ? `Lowest listed US price at ${esc(l.store_name)} <span class="sub">(${esc(l.drm || 'PC')} key, ${esc(l.region || 'region not stated')})</span>`
        : `US price at ${esc(l.store_name)} <span class="sub">(${esc(l.drm || 'PC')} key)</span>`;
      this.shadowRoot.innerHTML = `<style>${CSS}</style>
        <div class="box" part="box">
          <span class="price">${money(l.price)}</span>${l.discount_pct ? ` <span class="off">−${l.discount_pct}%</span>` : ''}
          <div class="what">${what}${steamKey}
            <div class="sub">${g.store_count >= 2 ? `${g.store_count} stores compared · ` : ''}${ago(l.checked_at)} · prices by <a class="brand" href="https://superduperbundle.com/" target="_blank" rel="noopener">SuperDuperBundle</a>, which may earn a commission from store links</div>
          </div>
          <a class="go" href="${esc(g.url)}" target="_blank" rel="noopener">${g.store_count >= 2 ? 'Compare prices' : 'View prices'}</a>
        </div>`;
    }
  }
  customElements.define('sdb-price', SdbPrice);
})();

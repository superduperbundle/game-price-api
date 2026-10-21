// SuperDuperBundle Game Price API client (https://superduperbundle.com/tools/api/). Zero dependencies; Node 18+, Deno,
// Bun and browsers (any runtime with fetch). Code: MIT. Data: under the API terms (https://superduperbundle.com/tools/api/#terms):
// whenever you display it, show a visible link to SuperDuperBundle (link each price to the game's `url`).

export const BASE_URL = 'https://superduperbundle.com/api/v1';
export const MAX_BATCH = 50;

export class ApiError extends Error {
  /** @param {number} status @param {string} code @param {string} message @param {number|null} retryAfter */
  constructor(status, code, message, retryAfter = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export class GamePrices {
  /** @param {{ apiKey?: string, client?: string, baseUrl?: string, fetch?: typeof fetch }} [options] */
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.client = options.client;
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/+$/, '');
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    /** Last rate-limit headers seen: { limit, remaining, reset } */
    this.rateLimit = null;
  }

  async #get(params) {
    const qs = new URLSearchParams(params);
    if (this.client) qs.set('client', this.client);
    const res = await this.fetch(`${this.baseUrl}/lookup/?${qs}`, { headers: { Accept: 'application/json', ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}) } });
    const lim = res.headers.get('x-ratelimit-limit');
    if (lim) this.rateLimit = { limit: Number(lim), remaining: Number(res.headers.get('x-ratelimit-remaining')), reset: Number(res.headers.get('x-ratelimit-reset')) };
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      const ra = res.headers.get('retry-after');
      throw new ApiError(res.status, body?.error?.code ?? 'http_error', body?.error?.message ?? `HTTP ${res.status}`, ra ? Number(ra) : null);
    }
    return body;
  }

  /** Search by name. Returns up to `limit` (1-5) games, best match first. */
  search(name, limit = 1) { return this.#get({ q: name, limit: String(limit) }); }

  /** One game by Steam app ID; the game or null. */
  async bySteamId(appId) { return (await this.#get({ steam_id: String(appId) })).results[0] ?? null; }

  /** Many games by Steam app ID (any length: split into batches of 50). Results in the order asked; unknown IDs left out. */
  async bySteamIds(appIds) {
    const out = [];
    for (let i = 0; i < appIds.length; i += MAX_BATCH) out.push(...(await this.#get({ steam_ids: appIds.slice(i, i + MAX_BATCH).join(',') })).results);
    return out;
  }

  /** One game by our id (the slug in https://superduperbundle.com/game/{slug}/); the game or null. */
  async bySlug(slug) { return (await this.#get({ slug })).results[0] ?? null; }

  /** One game from a Steam store URL or one of our game page URLs; the game or null. */
  async byUrl(url) { return (await this.#get({ url })).results[0] ?? null; }
}

/** Shortcut: the best match for a name, or null. */
export async function lookup(name, options) { return (await new GamePrices(options).search(name, 1)).results[0] ?? null; }

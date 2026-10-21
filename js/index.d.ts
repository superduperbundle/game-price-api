export declare const BASE_URL: string;
export declare const MAX_BATCH: number;

export interface Offer {
  store: string;
  store_name: string;
  /** official, retailer or marketplace */
  store_type: string;
  /** Lowest listed price in US dollars, as the store lists it (the store sets fees and the final total). */
  price: number;
  /** Where the key activates: Steam, GOG, DRM-free, ... */
  drm: string | null;
  region: string | null;
  /** ISO date-time the price was last checked. */
  checked_at: string | null;
}

export interface Game {
  id: string;
  name: string;
  steam_app_id: number | null;
  /** Compare page with every offer: link each price you show to this URL. */
  url: string;
  image: string | null;
  state: 'price' | 'free' | 'unreleased' | 'not_on_sale';
  currency: 'USD';
  /** Steam's regular price. */
  list_price: number | null;
  lowest: (Offer & { discount_pct: number | null }) | null;
  lowest_steam_key: Offer | null;
  /** Below 2, present the price as a price, not as a comparison. */
  store_count: number;
  offer_count: number;
  offers: Offer[];
}

export interface LookupResponse {
  api: 'v1';
  query?: Record<string, unknown>;
  not_found?: string[];
  count: number;
  results: Game[];
  attribution: { text: string; url: string };
  terms: string;
}

export declare class ApiError extends Error {
  status: number;
  code: string;
  retryAfter: number | null;
}

export interface Options {
  /** Free key from https://superduperbundle.com/tools/api/#keys (higher limits). Keep it out of browser code. */
  apiKey?: string;
  /** Your app's name (lowercase letters, digits, hyphens): tags our compare links so we can see which tools send visitors. */
  client?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export declare class GamePrices {
  constructor(options?: Options);
  rateLimit: { limit: number; remaining: number; reset: number } | null;
  search(name: string, limit?: number): Promise<LookupResponse>;
  bySteamId(appId: number): Promise<Game | null>;
  bySteamIds(appIds: number[]): Promise<Game[]>;
  bySlug(slug: string): Promise<Game | null>;
  byUrl(url: string): Promise<Game | null>;
}

export declare function lookup(name: string, options?: Options): Promise<Game | null>;

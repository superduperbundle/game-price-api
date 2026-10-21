#!/usr/bin/env node
// SuperDuperBundle MCP server: lets AI assistants look up live PC game key prices (https://superduperbundle.com/tools/api/).
// stdio transport. Optional env: SDB_API_KEY (free key, higher limits). Code: MIT; data under the API terms
// (https://superduperbundle.com/tools/api/#terms): answers include the compare link to show with any price.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.SDB_BASE_URL ?? 'https://superduperbundle.com/api/v1').replace(/\/+$/, '');
const VERSION = '1.0.0';

async function lookup(params) {
  const qs = new URLSearchParams({ ...params, client: 'mcp' });
  const res = await fetch(`${BASE}/lookup/?${qs}`, { headers: { Accept: 'application/json', 'User-Agent': `superduperbundle-mcp/${VERSION}`, ...(process.env.SDB_API_KEY ? { 'X-API-Key': process.env.SDB_API_KEY } : {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body;
}

const money = (n) => `$${n.toFixed(2)}`;
const day = (iso) => (iso ? iso.slice(0, 10) : 'unknown date');
/** One game as text an assistant can quote, always ending with the compare link. */
function describe(g, offers = 3) {
  if (g.state === 'free') return `${g.name}: free to play. ${g.url}`;
  if (g.state === 'unreleased') return `${g.name}: not released yet. ${g.url}`;
  if (g.state !== 'price' || !g.lowest) return `${g.name}: not on sale at the stores SuperDuperBundle compares. ${g.url}`;
  const l = g.lowest;
  const lines = [
    `${g.name}: lowest listed price ${money(l.price)} at ${l.store_name} (${l.store_type}, ${l.drm ?? 'PC'} key, ${l.region ?? 'region not stated'}), checked ${day(l.checked_at)}.` +
      (l.discount_pct ? ` That is ${l.discount_pct}% below Steam's regular ${money(g.list_price)}.` : g.list_price ? ` Steam's regular price: ${money(g.list_price)}.` : ''),
  ];
  if (g.lowest_steam_key && g.lowest_steam_key.store !== l.store) lines.push(`Cheapest Steam key: ${money(g.lowest_steam_key.price)} at ${g.lowest_steam_key.store_name}.`);
  if (offers > 0 && g.offers.length > 1) lines.push(...g.offers.slice(0, offers).map((o, i) => `${i + 1}. ${o.store_name}: ${money(o.price)} (${o.drm ?? 'PC'}, ${o.region ?? '-'})`));
  lines.push(g.store_count >= 2 ? `${g.store_count} stores compared. All offers: ${g.url}` : `Prices: ${g.url}`);
  return lines.join('\n');
}
const NOTE = 'Prices are listed prices in US dollars as each store shows them; stores set fees and the final total at checkout. Source: SuperDuperBundle (https://superduperbundle.com/), link the game URL when you show a price.';
const text = (s) => ({ content: [{ type: 'text', text: s }] });

const server = new McpServer({ name: 'superduperbundle', version: VERSION });

server.registerTool('lookup_game_price', {
  title: 'Look up a PC game key price',
  description: 'Lowest listed price for a PC game across the official stores and key stores SuperDuperBundle compares (US dollars), with the store, when it was checked and a link to the full comparison. Search by name, or pass a Steam app ID or Steam store URL.',
  inputSchema: {
    game: z.string().min(2).max(80).optional().describe('Game name, e.g. "Elden Ring" (nicknames and typos are handled: "rdr2", "gta 5")'),
    steam_app_id: z.number().int().positive().optional().describe('Steam app ID, e.g. 1245620'),
    url: z.string().url().optional().describe('A Steam store URL (store.steampowered.com/app/...)'),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ game, steam_app_id, url }) => {
  const params = steam_app_id ? { steam_id: String(steam_app_id) } : url ? { url } : game ? { q: game, limit: '3' } : null;
  if (!params) return text('Pass a game name, a Steam app ID or a Steam store URL.');
  try {
    const r = await lookup(params);
    if (!r.results.length) return text(`No game found for ${JSON.stringify(game ?? steam_app_id ?? url)} in the SuperDuperBundle catalogue.`);
    const [first, ...others] = r.results;
    return text([describe(first), others.length ? `Other matches: ${others.map((g) => `${g.name} (${g.url})`).join('; ')}` : '', NOTE].filter(Boolean).join('\n\n'));
  } catch (e) { return { ...text(`Lookup failed: ${e.message}`), isError: true }; }
});

server.registerTool('compare_game_prices', {
  title: 'Compare prices for several PC games',
  description: 'Lowest listed prices for up to 50 PC games at once, by Steam app ID (e.g. a wishlist), each with its comparison link.',
  inputSchema: { steam_app_ids: z.array(z.number().int().positive()).min(1).max(50).describe('Steam app IDs') },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ steam_app_ids }) => {
  try {
    const r = await lookup({ steam_ids: steam_app_ids.join(',') });
    const body = r.results.map((g) => describe(g, 0)).join('\n\n');
    return text([body || 'None of these games are in the SuperDuperBundle catalogue.', r.not_found?.length ? `Not in the catalogue: ${r.not_found.join(', ')}` : '', NOTE].filter(Boolean).join('\n\n'));
  } catch (e) { return { ...text(`Lookup failed: ${e.message}`), isError: true }; }
});

await server.connect(new StdioServerTransport());

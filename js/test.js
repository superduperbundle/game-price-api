// Offline test with a fake fetch (CI) + an optional live smoke test (LIVE=1).
import assert from 'node:assert/strict';
import { GamePrices, ApiError, lookup } from './index.js';

const calls = [];
const fake = async (url, init) => {
  calls.push({ url, init });
  const u = new URL(url);
  if (u.searchParams.get('q') === 'x') return new Response(JSON.stringify({ error: { code: 'query_too_short', message: 'q needs at least 2 letters or digits.' } }), { status: 400 });
  const ids = (u.searchParams.get('steam_ids') ?? u.searchParams.get('steam_id') ?? '1').split(',');
  return new Response(JSON.stringify({ api: 'v1', count: ids.length, results: ids.map((id) => ({ id: `g${id}`, steam_app_id: Number(id) })) }), { headers: { 'x-ratelimit-limit': '600', 'x-ratelimit-remaining': '590', 'x-ratelimit-reset': '300' } });
};
const c = new GamePrices({ fetch: fake, client: 'test', apiKey: 'sdb_0123456789abcdef0123456789abcdef' });
assert.equal((await c.bySteamId(1245620)).steam_app_id, 1245620);
assert.ok(calls[0].url.includes('/lookup/?steam_id=1245620&client=test'));
assert.equal(calls[0].init.headers['X-API-Key'], 'sdb_0123456789abcdef0123456789abcdef');
assert.deepEqual(c.rateLimit, { limit: 600, remaining: 590, reset: 300 });
const many = await c.bySteamIds(Array.from({ length: 120 }, (_, i) => i + 1));
assert.equal(many.length, 120);
assert.equal(calls.length, 4, '120 IDs = 3 batches of up to 50');
await assert.rejects(c.search('x'), (e) => e instanceof ApiError && e.status === 400 && e.code === 'query_too_short');

if (process.env.LIVE === '1') {
  const g = await lookup('elden ring', { client: 'ci-smoke' });
  assert.equal(g?.steam_app_id, 1245620);
  assert.ok(g.url.startsWith('https://superduperbundle.com/game/'));
  console.log('live:', g.name, g.lowest?.price, g.lowest?.store_name);
}
console.log('js client: ok');

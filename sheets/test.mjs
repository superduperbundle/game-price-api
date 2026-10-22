// Local test of Code.js with stand-ins for Apps Script's UrlFetchApp and CacheService, against the live API.
// node sheets/test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const calls = [];
const store = new Map();
const ctx = {
  console,
  UrlFetchApp: {
    fetch(url) {
      calls.push(url);
      const body = execFileSync('curl', ['-s', '-w', '\n%{http_code}', url], { encoding: 'utf8' });
      const i = body.lastIndexOf('\n');
      return { getResponseCode: () => Number(body.slice(i + 1)), getContentText: () => body.slice(0, i) };
    },
  },
  CacheService: { getScriptCache: () => ({
    getAll: (ks) => Object.fromEntries(ks.filter((k) => store.has(k)).map((k) => [k, store.get(k)])),
    putAll: (o) => { for (const [k, v] of Object.entries(o)) { assert.ok(v.length < 100000, 'cache value under 100 KB'); store.set(k, v); } },
  }) },
};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('./Code.js', import.meta.url), 'utf8'), ctx);

const p = ctx.GAMEPRICE('Elden Ring');
assert.equal(typeof p, 'number'); assert.ok(p > 0 && p < 100, `price ${p}`);
assert.equal(ctx.GAMEPRICE(1245620), p, 'same game by Steam ID');
assert.match(ctx.GAMEURL(1245620), /^https:\/\/superduperbundle\.com\/game\/elden-ring\/\?utm_source=google-sheets/);
assert.equal(typeof ctx.GAMESTORE(1245620), 'string');
const before = calls.length;
const grid = ctx.GAMEPRICE([[1245620], [1091500], [''], ['https://store.steampowered.com/app/292030/'], [999999999], ['Cyberpunk 2077']], 'price');
assert.equal(grid.length, 6); assert.equal(grid[2][0], ''); assert.equal(grid[4][0], '', 'unknown ID = empty');
assert.ok(typeof grid[1][0] === 'number' && grid[1][0] === grid[5][0], 'Cyberpunk by ID = by name');
assert.equal(calls.length - before, 2, 'one batch for the 3 uncached IDs + one name query (1245620 was cached)');
ctx.GAMEPRICE([[1245620], [1091500]]);
assert.equal(calls.length - before, 2, 'second call served from cache');
assert.ok(ctx.GAMEPRICE(1245620, 'discount') === '' || ctx.GAMEPRICE(1245620, 'discount') < 1);
assert.throws(() => ctx.GAMEPRICE(1245620, 'nope'));
const side = ctx.sidebarLookup('hades');
assert.ok(side.length && side[0].offers);
console.log('sheets add-on: ok |', 'ELDEN RING', p, '|', calls.length, 'API calls');

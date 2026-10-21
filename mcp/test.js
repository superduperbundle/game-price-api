// Live test: start the server over stdio with the SDK client, list tools, call both.
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'test', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ['index.js'] }));
const { tools } = await client.listTools();
assert.deepEqual(tools.map((t) => t.name).sort(), ['compare_game_prices', 'lookup_game_price']);
const one = await client.callTool({ name: 'lookup_game_price', arguments: { game: 'elden ring' } });
const t1 = one.content[0].text;
assert.match(t1, /ELDEN RING: lowest listed price \$\d+\.\d\d at /);
assert.match(t1, /https:\/\/superduperbundle\.com\/game\/elden-ring\/\?utm_source=mcp/);
const many = await client.callTool({ name: 'compare_game_prices', arguments: { steam_app_ids: [1245620, 1091500, 999999999] } });
assert.match(many.content[0].text, /Not in the catalogue: 999999999/);
console.log(t1.split('\n')[0]);
await client.close();
console.log('mcp server: ok');

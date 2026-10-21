// Tests the REMOTE MCP endpoint (https://superduperbundle.com/mcp) with the official SDK's Streamable HTTP client:
// handshake, tools/list, both tools. Usage: node test-remote.js [base URL]
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = process.argv[2] ?? 'https://superduperbundle.com';
const client = new Client({ name: 'remote-test', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', base)));
const { tools } = await client.listTools();
assert.deepEqual(tools.map((t) => t.name).sort(), ['compare_game_prices', 'lookup_game_price']);
const one = await client.callTool({ name: 'lookup_game_price', arguments: { game: 'elden ring' } });
assert.match(one.content[0].text, /ELDEN RING: lowest listed price \$\d+\.\d\d at /);
assert.match(one.content[0].text, /utm_source=mcp-remote/);
const many = await client.callTool({ name: 'compare_game_prices', arguments: { steam_app_ids: [1245620, 1091500, 999999999] } });
assert.match(many.content[0].text, /Not in the catalogue: 999999999/);
const bad = await client.callTool({ name: 'lookup_game_price', arguments: {} });
assert.equal(bad.isError, true);
await client.close();
console.log(one.content[0].text.split('\n')[0]);
console.log('remote mcp: ok', base);

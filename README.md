# SuperDuperBundle Game Price API

Free API, clients and MCP server for live PC game key prices. Look up a game by name, Steam app ID or Steam store URL and
get the lowest listed price across the official stores and key stores [SuperDuperBundle](https://superduperbundle.com/)
compares, in US dollars, with the store, when it was checked and a link to the full comparison.

- **Documentation:** https://superduperbundle.com/tools/api/
- **OpenAPI 3.1:** [`openapi.json`](openapi.json) (live copy: https://superduperbundle.com/api/v1/openapi.json)
- No key needed. [Free keys](https://superduperbundle.com/tools/api/#keys) raise the limits.

| Package | Install | Folder |
|---|---|---|
| JavaScript / TypeScript client | `npm install superduperbundle` | [`js/`](js/) |
| Python client | `pip install superduperbundle` | [`python/`](python/) |
| MCP server (AI assistants) | `npx -y @superduperbundle/mcp-server` | [`mcp/`](mcp/) |

## Quick start

```bash
curl "https://superduperbundle.com/api/v1/lookup/?q=elden+ring&client=my-app"
curl "https://superduperbundle.com/api/v1/lookup/?steam_ids=1245620,1091500,292030"
```

```js
import { GamePrices } from 'superduperbundle';
const api = new GamePrices({ client: 'my-app' });
const game = await api.bySteamId(1245620);
console.log(game.name, game.lowest?.price, game.lowest?.store_name, game.url);
```

```python
from superduperbundle import GamePrices
game = GamePrices(client="my-app").by_steam_id(1245620)
print(game["name"], game["lowest"]["price"], game["lowest"]["store_name"], game["url"])
```

### MCP (Claude Desktop, Cursor, VS Code and other MCP clients)

```json
{
  "mcpServers": {
    "superduperbundle": { "command": "npx", "args": ["-y", "@superduperbundle/mcp-server"] }
  }
}
```

Or connect by URL, nothing to install (Claude, ChatGPT, Cursor and other clients that support remote MCP servers):

```
https://superduperbundle.com/mcp
```

Tools: `lookup_game_price` (name, Steam app ID or Steam URL) and `compare_game_prices` (up to 50 Steam app IDs).

## What you get

Each game: `state` (`price`, `free`, `unreleased`, `not_on_sale`), `lowest` (cheapest PC key of any kind, `drm` says where
it activates), `lowest_steam_key`, Steam's `list_price`, `discount_pct` (only when real), `store_count`, up to 10 `offers`
with `checked_at`, and `url`: the compare page with every offer. Prices are listed prices as each store shows them; stores
set fees and the final total at checkout. SuperDuperBundle compares prices; it does not sell keys.

## Limits

Uncached games per 10 minutes: 600 per address without a key, 2,500 with a free key, 10,000 for partner keys (a public
page of your project links to SuperDuperBundle). Answers are cached for 15 minutes; every answer carries
`X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`.

## Licence and data terms

- The **code** in this repository (clients, MCP server, examples) is MIT licensed: see [LICENSE](LICENSE).
- The **price data** the API returns is not covered by the MIT licence. It is provided under the
  [API terms](https://superduperbundle.com/tools/api/#terms): free to use in apps, sites, bots and extensions; whenever you
  display it, show a visible link to SuperDuperBundle (link each price to the game's `url`); do not resell it or mirror it
  as a price database.

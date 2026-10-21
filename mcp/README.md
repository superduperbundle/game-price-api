# SuperDuperBundle Game Price API: MCP server

`npx -y @superduperbundle/mcp-server`

Live PC game key prices (lowest listed price across official stores and key stores, US dollars) by name, Steam app ID or Steam store URL, with the link to the full comparison on [SuperDuperBundle](https://superduperbundle.com/).

- Usage and examples: https://github.com/superduperbundle/game-price-api#readme
- API documentation, limits and free keys: https://superduperbundle.com/tools/api/

Code: MIT. Price data: under the [API terms](https://superduperbundle.com/tools/api/#terms); whenever you display it, show a visible link to SuperDuperBundle.

## Setup (Claude Desktop, Cursor, VS Code and other MCP clients)

```json
{ "mcpServers": { "superduperbundle": { "command": "npx", "args": ["-y", "@superduperbundle/mcp-server"] } } }
```

Tools: `lookup_game_price` (game name, Steam app ID or Steam URL) and `compare_game_prices` (up to 50 Steam app IDs).
Optional environment variable `SDB_API_KEY` (free key) for higher limits.

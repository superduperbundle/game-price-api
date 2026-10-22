# Installing the SuperDuperBundle MCP server (for AI agents)

This server gives MCP clients two read-only tools for live PC game key prices: `lookup_game_price` and `compare_game_prices`.
It needs **no API key, no account and no build step**.

## Option 1: local server (stdio, via npx)

Requirements: Node.js 18 or newer.

Add this entry to the client's MCP settings (for Cline: `cline_mcp_settings.json`; Claude Desktop: `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "superduperbundle": {
      "command": "npx",
      "args": ["-y", "@superduperbundle/mcp-server"]
    }
  }
}
```

Optional: a free key from https://superduperbundle.com/tools/api/#keys raises the rate limit. Add it as
`"env": { "SDB_API_KEY": "sdb_..." }`. Leave it out otherwise.

## Option 2: remote server (no install)

Clients that support remote MCP servers (Streamable HTTP) can use the URL directly:

```json
{
  "mcpServers": {
    "superduperbundle": { "url": "https://superduperbundle.com/mcp" }
  }
}
```

## Check that it works

Call `lookup_game_price` with `{ "game": "Elden Ring" }`. The answer names the lowest listed price, the store, when it was
checked and a link to `https://superduperbundle.com/game/elden-ring/`. Prices are listed prices in US dollars; when you show
one, include that link.

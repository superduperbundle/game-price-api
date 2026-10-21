# MCP server (stdio) for directories that build servers in Docker (e.g. Glama's checks).
FROM node:22-slim
WORKDIR /app
COPY mcp/package.json mcp/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY mcp/index.js ./
ENTRYPOINT ["node", "index.js"]

# @forge/mcp

The Forge MCP server — a stateless **Streamable HTTP** MCP server (Node + Express) that lets Claude Code / Codex create and manage tickets. Backed by Supabase via the service-role key; secured with a Bearer API key.

## Tools

| Tool | Purpose |
|---|---|
| `list_projects` | List all projects (id, name, prefix, color, …) |
| `create_ticket` | Create a backlog ticket; returns the computed ref (e.g. `PI-42`) |
| `list_tickets` | List tickets with filters (project, status, priority, tags) |
| `get_ticket` | Get one ticket by ref with tags + full activity log |
| `update_ticket` | Update title/description/acceptance/priority/tags (logs a diff comment) |
| `update_ticket_status` | Move a ticket between columns (status change logged by DB trigger) |
| `add_comment` | Append a comment to a ticket's activity log |

## Local development

```bash
cp .env.example .env     # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FORGE_API_KEY
npm run dev              # tsx watch, from repo root or this package
```

Server endpoints:
- `GET /health` — unauthenticated health check (used by Railway)
- `POST /mcp` — MCP endpoint; requires `Authorization: Bearer <FORGE_API_KEY>`

### Quick manual check

```bash
curl -s localhost:3000/health
# {"status":"ok"}

curl -s -X POST localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $FORGE_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Connecting Claude Code

```bash
claude mcp add --transport http forge https://<your-railway-url>/mcp \
  --header "Authorization: Bearer <FORGE_API_KEY>"
```

## Environment

| Var | Description |
|---|---|
| `PORT` | Listen port (default 3000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side only; bypasses RLS) |
| `FORGE_API_KEY` | Shared Bearer secret clients must send |

## Build & deploy (Railway)

`npm run build` bundles to `dist/index.js` with tsup (the `@forge/shared` workspace is inlined, so only external deps are needed at runtime). Deployment is driven by [`../railway.json`](../railway.json): build with `npm ci && npm run build --workspace @forge/mcp`, start with `node forge-mcp/dist/index.js`, healthcheck `/health`. Set the env vars in the Railway dashboard.

## Architecture notes

- **Stateless transport**: a fresh `McpServer` + `StreamableHTTPServerTransport` (`sessionIdGenerator: undefined`, `enableJsonResponse: true`) is created per request.
- **Repository pattern**: tool handlers depend on the `ForgeRepository` interface, not Supabase directly, so they're unit-tested against an in-memory fake (`tests/fake-repository.ts`).
- **Error policy**: 4xx `AppError`s (not-found, validation) surface their message to the agent; 5xx/unknown errors are logged server-side and returned as a generic message.

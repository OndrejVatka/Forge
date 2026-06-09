# Forge

AI-native, Kanban-style project management for developers working with Claude Code & Codex. Forge exposes an **MCP server** so AI agents can natively create and move tickets, plus a mobile-first **React PWA** for the human interface.

## Monorepo layout

| Package | Description | Deploys to |
|---|---|---|
| `forge-shared` | Shared TypeScript domain types + Zod schemas | — (workspace lib) |
| `forge-mcp` | Streamable HTTP MCP server (Node + Express, Supabase service role) | Railway |
| `forge-ui` | React + Vite PWA (Supabase anon, Google OAuth) | Vercel |
| `db/` | `schema.sql` — run in the Supabase SQL Editor | Supabase |

> `forge-mcp` and `forge-ui` are added in later build phases. Phase 0 ships the tooling, `forge-shared`, and the database schema.

## Conventions

- **TypeScript strict**, no `any`. Tests with **Vitest** alongside implementation.
- Fixed value sets (status / priority / authors) live in `forge-shared` as Zod enums — single source of truth shared by server and UI, mirroring the DB CHECK constraints.

## Scripts (root)

```bash
npm install          # install all workspaces
npm run typecheck    # tsc --noEmit across workspaces
npm run lint         # eslint
npm run format       # prettier --write
npm test             # vitest run
```

## Setup

1. **Database** — create a Supabase project and run [`db/schema.sql`](db/schema.sql) in the SQL Editor. Enable Google OAuth under Auth providers.
2. **MCP server** — see `forge-mcp/README.md` (Phase 1).
3. **Web UI** — see `forge-ui/README.md` (Phase 2).

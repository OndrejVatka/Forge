# Contributing

Thanks for taking a look. Forge is a side project maintained by one person, so responses may take a few days — but issues and pull requests are genuinely welcome.

## Before you start

For anything more than a small fix, **open an issue first**. It's no fun to write a feature and then find out it doesn't fit the direction of the project. A quick "I'd like to add X, does that make sense?" saves everyone time.

Small things — typos, broken links, obvious bugs — just send the PR.

## Setting up

You'll need Node 20+ and your own Supabase project. The [README](README.md#setup) covers the full setup; the short version:

```bash
git clone https://github.com/OndrejVatka/Forge.git
cd Forge
npm install

cp forge-ui/.env.example forge-ui/.env      # fill in your Supabase values
cp forge-mcp/.env.example forge-mcp/.env

npm run dev --workspace @forge/ui           # UI on :5173
npm run dev --workspace @forge/mcp          # MCP server on :3000
```

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm test
npm run format
```

All four should pass. That's the whole bar.

## Conventions

- **TypeScript strict, no `any`.** If it's genuinely unavoidable, add a comment explaining why.
- **Commits:** `type(scope): description` — `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`.
- **Tests** for business logic and anything security-related. Not for implementation details.
- **Comments explain why, not what.**

Two project-specific things worth knowing before you change them:

- **Status-change comments come from a database trigger**, not application code. That's deliberate — it keeps the activity log identical whether a human drags a card or an agent calls `update_ticket_status`. Don't move that logic into the app.
- **MCP tool handlers depend on the `ForgeRepository` interface**, not on Supabase directly, so they can be tested against an in-memory fake. Please keep that boundary.

## Changes to `db/schema.sql`

The RLS policies are the only thing protecting a user's data, so schema changes get extra scrutiny. If you touch them:

- Explain the access-control impact in your PR description
- Add a migration under `db/migrations/` for existing installs — editing `schema.sql` alone only helps fresh ones
- Say whether you actually ran it against a real Supabase project

## Security issues

Please don't open a public issue — see [SECURITY.md](SECURITY.md).

## License

Contributions are accepted under the [MIT License](LICENSE), same as the rest of the project.

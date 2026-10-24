# Operations: deploys, backups, migrations

How Forge production is shipped and protected. All commands run from the repo
root on a maintainer's machine; the tooling lives in [`forge-ops/`](../forge-ops).

| Command | What it does |
|---|---|
| `make deploy PR=<n>` | **The only way to ship.** Preflight → backup → migrations → merge → wait for Railway + Vercel → `/health` → smoke test |
| `make deploy-dry-run PR=<n>` | Preflight and backup only; applies and merges nothing |
| `make backup` | Back up production now |
| `make restore-test [FILE=...]` | Restore a backup into the scratch DB and verify it |
| `make migrate-status` | List pending migrations |
| `make migrate` | Back up, then apply pending migrations outside a deploy |
| `make smoke` | `/health` + authenticated MCP smoke test against production |
| `make verify` | Typecheck, lint, test, format check, build |

## One-time setup

1. Install the Postgres client tools (no server):

   ```bash
   brew install libpq
   ```

   The tooling finds Homebrew's keg-only `libpq` by itself; set `PG_BIN` if yours is elsewhere. `pg_dump` must be the same major version as the server or newer.

2. Create a **scratch Supabase project** for restore tests (free tier is fine). It is wiped on every restore test, so keep nothing in it.

3. `cp forge-ops/.env.example forge-ops/.env` and fill it in. It holds production credentials: it is gitignored, keep it that way. Use the **Session pooler** connection strings (port 5432).

4. If the production database predates this tooling, record the migrations that were already applied by hand. For the current production database that is everything up to `0003`:

   ```bash
   make migrate-baseline THROUGH=0003
   ```

   This takes a backup, creates `forge_meta.schema_migrations`, and marks `0001`–`0003` as applied without running them. Run it once per database.

## Deploying

Railway (MCP server) and Vercel (UI) deploy whatever lands on `main`, so a deploy is a merge. **Do not merge PRs in the GitHub UI**: that skips the backup, the migrations and the checks. Instead:

```bash
gh pr checkout <n> && git pull
make deploy PR=<n>
```

The wrapper stops at the first failure and exits non-zero, naming the step:

1. **Preflight**: PR is open, not a draft, targets `main`, and GitHub reports it `CLEAN` (CI green, no conflicts). The local checkout must be exactly the PR head with no uncommitted changes, because migrations are read from disk. Migration history must be consistent (see below).
2. **Backup**: a full backup of our schemas. **If it fails, nothing else runs.**
3. **Migrations**: pending files in `db/migrations/` are applied, each in its own transaction.
4. **Merge**: `gh pr merge --merge`, pinned to the head commit preflight checked, so a late push can't sneak in.
5. **Hosts**: waits up to 15 minutes for the `Vercel` and `Forge - @forge/mcp` commit statuses on the merge commit to succeed. Railway reports success even when it skips a build because nothing in `forge-mcp/` changed.
6. **Health**: polls `GET /health` until it answers `{"status":"ok"}`, for up to 2 minutes.
7. **Smoke test**: confirms an unauthenticated `/mcp` request gets `401`, then connects as an authenticated MCP client, checks the core tools are registered, and calls `list_projects`. Read-only, so it leaves nothing on the board.

If a step after the merge fails, the code is already live. Roll back by reverting the merge in a new PR and deploying that. Use the printed backup if data is involved (see [Restoring production](#restoring-production)).

## Backups

`make backup`, and every deploy and migration run, writes a `pg_dump` custom-format archive of the `public` and `forge_meta` schemas:

- **Where:** `~/Backups/forge/` (`FORGE_BACKUP_DIR`). The folder is `0700` and the files are `0600`, because they contain every ticket, comment and allowlisted email.
- **Name:** `forge-<UTC timestamp>-<label>.dump`, e.g. `forge-20261024T195012Z-pre-deploy-pr37.dump`.
- **Manifest:** `<dump>.json` next to it records each table's row count at backup time. Restore tests check against it.
- **Verification:** a dump that `pg_restore --list` can't read, or that has no `tickets` data, is deleted and the command fails.
- **Retention:** after each backup, files older than **30 days** are pruned, but the newest **10** are always kept, however old. Both are configurable (`FORGE_BACKUP_RETENTION_DAYS`, `FORGE_BACKUP_KEEP_MIN`). Only files matching the naming scheme are ever deleted.

Supabase-managed schemas (`auth`, `storage`, `realtime`, …) are not included. Sign-in accounts live in Supabase Auth; after a restore into a new project, users sign in again with the same email and the allowlist still applies.

Backups are only as safe as the laptop they're on. Copy them somewhere else (encrypted) if that matters to you.

## Restore testing

```bash
make restore-test            # newest backup
make restore-test FILE=~/Backups/forge/forge-...dump
```

The test restores into `FORGE_RESTORE_DB_URL` with `--clean --single-transaction`, then fails unless:

- every table's row count matches the backup's manifest, and
- every `public` table still has row-level security enabled.

It refuses to run if the target is the production database. Run it after changing the backup tooling, after a schema change, and every month or so anyway: an untested backup is a hope, not a backup.

## Restoring production

The tooling deliberately has no command that writes a backup into production. If you really need one (data loss or a bad migration), do it by hand, deliberately:

1. Take a fresh backup of the current state first (`make backup`), even if it's broken. It may hold writes made since the backup you're about to restore.
2. Rehearse with `make restore-test FILE=<the backup>`.
3. Then restore into production. `--clean` drops and recreates every object in the dump:

   ```bash
   PGPASSWORD='<prod password>' /opt/homebrew/opt/libpq/bin/pg_restore \
     --dbname 'postgresql://postgres.<ref>@<pooler-host>:5432/postgres' \
     --clean --if-exists --no-owner --single-transaction --exit-on-error <file>.dump
   ```

4. Run `make smoke` and check the board.

## Migrations

Schema changes ship as numbered files in [`db/migrations/`](../db/migrations), applied by the deploy wrapper. The SQL Editor is no longer part of the procedure. Applied migrations are recorded in `forge_meta.schema_migrations` with a SHA-256 checksum. The `forge_meta` schema isn't exposed through the Supabase Data API.

**Writing one:**

- Name it `NNNN_snake_case_description.sql`, numbered one past the highest existing file.
- **No `BEGIN`/`COMMIT`.** The runner wraps the file and its bookkeeping row in a single transaction, so a migration is either applied and recorded, or neither. (`0001`–`0003` predate this; they're baselined, never re-run.)
- **Keep the currently deployed code working.** Migrations run *before* the merge. Add first (new column, new table), switch the code over, and remove the old thing in a later PR.
- Update `db/schema.sql` too, so fresh installs match.
- Never edit a migration once it has been applied. The runner compares checksums and refuses to continue. Write a new one instead.

**Applying:** `make deploy` does it. To migrate without a code change, use `make migrate` (it backs up first). `make migrate-status` shows what's pending.

The runner refuses to apply anything when an applied file was edited, an applied file is missing, or a new file is numbered before one already applied.

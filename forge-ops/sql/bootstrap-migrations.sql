-- Migration bookkeeping for forge-ops. Idempotent; run by `migrate baseline`.
--
-- Lives in its own schema rather than `public` because Supabase exposes
-- `public` through the Data API, and this table has no business being
-- readable or writable by `anon` or `authenticated`.

CREATE SCHEMA IF NOT EXISTS forge_meta;
REVOKE ALL ON SCHEMA forge_meta FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS forge_meta.schema_migrations (
  name       TEXT PRIMARY KEY,
  checksum   TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL DEFAULT current_user
);

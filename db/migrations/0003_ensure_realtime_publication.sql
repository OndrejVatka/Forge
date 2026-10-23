-- Migration 0003 — make sure `tickets` and `comments` are in the Realtime publication
--
-- The board subscribes to postgres_changes on both tables in one channel
-- (forge-ui/src/hooks/useRealtime.ts). If either table is missing from
-- `supabase_realtime`, Supabase rejects the whole channel right after the join,
-- so the board gets no live updates at all, not just for that table.
-- `db/schema.sql` adds both, but an existing database can drift (in production
-- `comments` was found missing on 2026-10-23). New installs get this from
-- `db/schema.sql` directly and do not need to run this file.
--
-- Additive only: it adds a table to the publication if it is not already
-- there, and touches no rows. Safe to re-run.
--
-- Run the whole file in the Supabase SQL Editor. It is wrapped in a
-- transaction, so it either fully applies or fully rolls back.

BEGIN;

-- ALTER PUBLICATION ... ADD TABLE errors if the table is already a member, so
-- check first to keep this idempotent.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tickets', 'comments'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE 'added public.% to supabase_realtime', tbl;
    END IF;
  END LOOP;
END
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Both tables should be listed:
--
--   SELECT schemaname, tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' ORDER BY tablename;
--
-- Then open the board: the browser console should show no
-- "[forge] live updates unavailable" error, and a ticket created through MCP
-- should appear without a refresh.
--
-- Rollback, if ever needed (stops live updates for that table):
--
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.comments;

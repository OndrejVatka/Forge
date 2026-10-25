-- Put `tickets` and `comments` back in the Realtime publication after a
-- restore. pg_dump of selected schemas doesn't carry publication membership,
-- and without it the board gets no live updates (see FO-22 and migration 0003,
-- whose body this mirrors without its BEGIN/COMMIT, since forge-ops runs it
-- inside the restore transaction).

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
    END IF;
  END LOOP;
END
$$;

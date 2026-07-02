
-- Update the partition-creation helper to also enable RLS on each partition.
CREATE OR REPLACE FUNCTION public.ensure_daily_partition(
  parent regclass,
  day    date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_name text;
  part_name   text;
  start_ts    text := to_char(day, 'YYYY-MM-DD') || ' 00:00:00+00';
  end_ts      text := to_char(day + 1, 'YYYY-MM-DD') || ' 00:00:00+00';
BEGIN
  SELECT c.relname INTO parent_name FROM pg_class c WHERE c.oid = parent;
  part_name := parent_name || '_' || to_char(day, 'YYYYMMDD');
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
    part_name, parent_name, start_ts, end_ts
  );
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);
END $$;

-- Enable RLS on every existing partition of both tables.
DO $$
DECLARE
  part regclass;
BEGIN
  FOR part IN
    SELECT inhrelid::regclass
    FROM pg_inherits
    WHERE inhparent IN (
      'public.web_vitals'::regclass,
      'public.interaction_events_log'::regclass
    )
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', part::text);
  END LOOP;
END $$;

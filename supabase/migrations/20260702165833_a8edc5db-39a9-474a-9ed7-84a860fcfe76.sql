
ALTER TABLE public.web_vitals RENAME TO web_vitals_legacy;
ALTER INDEX public.web_vitals_pkey RENAME TO web_vitals_legacy_pkey;
ALTER INDEX public.idx_web_vitals_metric_created RENAME TO idx_web_vitals_legacy_metric_created;

CREATE TABLE public.web_vitals (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid,
  metric_name     text NOT NULL,
  metric_value    double precision NOT NULL,
  metric_rating   text,
  navigation_type text,
  path            text,
  user_agent      text,
  is_native       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

GRANT SELECT, INSERT ON public.web_vitals TO anon, authenticated;
GRANT ALL ON public.web_vitals TO service_role;

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert web vitals"
  ON public.web_vitals FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_web_vitals_metric_created
  ON public.web_vitals (metric_name, created_at DESC);

ALTER TABLE public.interaction_events_log RENAME TO interaction_events_log_legacy;
ALTER INDEX public.interaction_events_log_pkey RENAME TO interaction_events_log_legacy_pkey;
ALTER INDEX public.interaction_events_log_created_at_idx RENAME TO interaction_events_log_legacy_created_at_idx;
ALTER SEQUENCE public.interaction_events_log_id_seq RENAME TO interaction_events_log_legacy_id_seq;

CREATE SEQUENCE public.interaction_events_log_id_seq;

CREATE TABLE public.interaction_events_log (
  id          bigint NOT NULL DEFAULT nextval('public.interaction_events_log_id_seq'),
  user_id     uuid NOT NULL,
  event_id    uuid NOT NULL,
  signal_type text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

ALTER SEQUENCE public.interaction_events_log_id_seq OWNED BY public.interaction_events_log.id;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interaction_events_log TO authenticated;
GRANT ALL ON public.interaction_events_log TO service_role;

ALTER TABLE public.interaction_events_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users cannot read the log directly"
  ON public.interaction_events_log FOR SELECT TO authenticated USING (false);
CREATE POLICY "Users insert their own interaction log rows"
  ON public.interaction_events_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX interaction_events_log_created_at_idx
  ON public.interaction_events_log (created_at);

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
END $$;

CREATE OR REPLACE FUNCTION public.maintain_daily_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d              date;
  parent         regclass;
  parents        regclass[] := ARRAY['public.web_vitals'::regclass,
                                     'public.interaction_events_log'::regclass];
  retention_days int := 7;
  cutoff         timestamptz := date_trunc('day', now()) - make_interval(days => retention_days);
  part_rec       record;
  part_upper     timestamptz;
BEGIN
  FOREACH parent IN ARRAY parents LOOP
    FOR d IN SELECT generate_series(
      (now() at time zone 'utc')::date - 1,
      (now() at time zone 'utc')::date + 2,
      '1 day'::interval
    )::date LOOP
      PERFORM public.ensure_daily_partition(parent, d);
    END LOOP;
  END LOOP;

  FOR part_rec IN
    SELECT
      inhrelid::regclass AS part,
      pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE inhparent = ANY (parents)
  LOOP
    part_upper := (regexp_match(part_rec.bound, 'TO \(''([^'']+)''\)'))[1]::timestamptz;
    IF part_upper <= cutoff THEN
      EXECUTE format('DROP TABLE IF EXISTS %s', part_rec.part::text);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE d date;
BEGIN
  FOR d IN SELECT generate_series(
    (now() at time zone 'utc')::date - 10,
    (now() at time zone 'utc')::date + 2,
    '1 day'::interval
  )::date LOOP
    PERFORM public.ensure_daily_partition('public.web_vitals'::regclass, d);
    PERFORM public.ensure_daily_partition('public.interaction_events_log'::regclass, d);
  END LOOP;
END $$;

INSERT INTO public.web_vitals
SELECT * FROM public.web_vitals_legacy
WHERE created_at >= now() - interval '7 days';

INSERT INTO public.interaction_events_log (id, user_id, event_id, signal_type, created_at)
SELECT id, user_id, event_id, signal_type, created_at
FROM public.interaction_events_log_legacy
WHERE created_at >= now() - interval '7 days';

SELECT setval(
  'public.interaction_events_log_id_seq',
  GREATEST(
    (SELECT COALESCE(max(id), 0) FROM public.interaction_events_log_legacy),
    (SELECT COALESCE(max(id), 0) FROM public.interaction_events_log)
  ) + 1,
  false
);

DROP TABLE public.web_vitals_legacy;
DROP TABLE public.interaction_events_log_legacy;

DO $$
BEGIN
  PERFORM cron.unschedule('maintain-daily-partitions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'maintain-daily-partitions',
  '23 3 * * *',
  $$SELECT public.maintain_daily_partitions();$$
);

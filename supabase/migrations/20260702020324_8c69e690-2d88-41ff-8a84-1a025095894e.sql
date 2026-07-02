
-- 1) Idempotent trending refresh (short-circuits when idle, only writes changed rows).
CREATE OR REPLACE FUNCTION public.refresh_trending_scores_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _has_recent boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.event_likes  WHERE created_at >= NOW() - INTERVAL '1 hour'
    UNION ALL
    SELECT 1 FROM public.saved_events WHERE created_at >= NOW() - INTERVAL '1 hour'
    UNION ALL
    SELECT 1 FROM public.reposts      WHERE created_at >= NOW() - INTERVAL '1 hour'
    UNION ALL
    SELECT 1 FROM public.guestlist_entries
      WHERE status = 'approved' AND joined_at >= NOW() - INTERVAL '1 hour'
  ) INTO _has_recent;

  IF NOT _has_recent AND EXISTS (SELECT 1 FROM public.trending_scores_cache) THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE _tsc_new ON COMMIT DROP AS
  WITH signals AS (
    SELECT event_id, created_at, 3::int AS w, 'like'::text AS kind
      FROM public.event_likes WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 5, 'save'
      FROM public.saved_events WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, joined_at, 5, 'join'
      FROM public.guestlist_entries
      WHERE status = 'approved' AND joined_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 3, 'repost'
      FROM public.reposts WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 1, 'click'
      FROM public.interaction_events_log
      WHERE signal_type = 'click' AND created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT
    s.event_id,
    COALESCE(SUM(s.w), 0)::numeric AS trending_score,
    COUNT(*) FILTER (
      WHERE s.created_at >= NOW() - INTERVAL '2 hours'
        AND s.kind IN ('join', 'save', 'like', 'repost')
    )::bigint AS velocity_count
  FROM signals s
  GROUP BY s.event_id;

  INSERT INTO public.trending_scores_cache (event_id, trending_score, velocity_count, updated_at)
  SELECT n.event_id, n.trending_score, n.velocity_count, now()
  FROM _tsc_new n
  ON CONFLICT (event_id) DO UPDATE
    SET trending_score = EXCLUDED.trending_score,
        velocity_count = EXCLUDED.velocity_count,
        updated_at     = now()
    WHERE public.trending_scores_cache.trending_score IS DISTINCT FROM EXCLUDED.trending_score
       OR public.trending_scores_cache.velocity_count IS DISTINCT FROM EXCLUDED.velocity_count;

  DELETE FROM public.trending_scores_cache c
  WHERE NOT EXISTS (SELECT 1 FROM _tsc_new n WHERE n.event_id = c.event_id);
END;
$function$;

-- 2) Bulk upsert preference RPCs.
CREATE OR REPLACE FUNCTION public.bulk_upsert_category_preferences(_records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH src AS (
    SELECT
      (r->>'user_id')::uuid                          AS user_id,
      r->>'category'                                 AS category,
      (r->>'avg_weight')::numeric                    AS avg_weight,
      (r->>'count')::int                             AS cnt,
      (r->>'latest')::timestamptz                    AS latest,
      COALESCE((r->>'is_negative')::boolean, false)  AS is_negative
    FROM jsonb_array_elements(_records) AS r
  )
  INSERT INTO public.user_category_preferences AS t
    (user_id, category, score, interaction_count, last_interaction)
  SELECT
    s.user_id, s.category,
    CASE WHEN s.is_negative THEN 0
         ELSE LEAST(100, GREATEST(0, s.avg_weight)) END,
    s.cnt, s.latest
  FROM src s
  ON CONFLICT (user_id, category) DO UPDATE
    SET score = CASE
          WHEN (SELECT s2.is_negative FROM src s2
                WHERE s2.user_id = EXCLUDED.user_id AND s2.category = EXCLUDED.category LIMIT 1)
          THEN GREATEST(0, t.score - 30)
          ELSE LEAST(100, GREATEST(0, t.score * 0.7 +
               (SELECT s2.avg_weight FROM src s2
                WHERE s2.user_id = EXCLUDED.user_id AND s2.category = EXCLUDED.category LIMIT 1) * 0.3))
        END,
        interaction_count = t.interaction_count + EXCLUDED.interaction_count,
        last_interaction  = GREATEST(t.last_interaction, EXCLUDED.last_interaction);
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_creator_preferences(_records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH src AS (
    SELECT
      (r->>'user_id')::uuid                          AS user_id,
      (r->>'creator_id')::uuid                       AS creator_id,
      (r->>'avg_weight')::numeric                    AS avg_weight,
      (r->>'count')::int                             AS cnt,
      (r->>'latest')::timestamptz                    AS latest,
      COALESCE((r->>'is_negative')::boolean, false)  AS is_negative
    FROM jsonb_array_elements(_records) AS r
  )
  INSERT INTO public.user_creator_preferences AS t
    (user_id, creator_id, score, interaction_count, last_interaction)
  SELECT
    s.user_id, s.creator_id,
    CASE WHEN s.is_negative THEN 0
         ELSE LEAST(100, GREATEST(0, s.avg_weight)) END,
    s.cnt, s.latest
  FROM src s
  ON CONFLICT (user_id, creator_id) DO UPDATE
    SET score = CASE
          WHEN (SELECT s2.is_negative FROM src s2
                WHERE s2.user_id = EXCLUDED.user_id AND s2.creator_id = EXCLUDED.creator_id LIMIT 1)
          THEN GREATEST(0, t.score - 30)
          ELSE LEAST(100, GREATEST(0, t.score * 0.7 +
               (SELECT s2.avg_weight FROM src s2
                WHERE s2.user_id = EXCLUDED.user_id AND s2.creator_id = EXCLUDED.creator_id LIMIT 1) * 0.3))
        END,
        interaction_count = t.interaction_count + EXCLUDED.interaction_count,
        last_interaction  = GREATEST(t.last_interaction, EXCLUDED.last_interaction);
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_day_preferences(_records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH src AS (
    SELECT
      (r->>'user_id')::uuid           AS user_id,
      (r->>'day_of_week')::int        AS dow,
      r->>'category'                  AS category,
      (r->>'avg_weight')::numeric     AS avg_weight,
      (r->>'count')::int              AS cnt,
      (r->>'latest')::timestamptz     AS latest
    FROM jsonb_array_elements(_records) AS r
  )
  INSERT INTO public.user_day_preferences AS t
    (user_id, day_of_week, category, score, interaction_count, last_interaction)
  SELECT
    s.user_id, s.dow, s.category,
    LEAST(100, GREATEST(0, s.avg_weight)),
    s.cnt, s.latest
  FROM src s
  ON CONFLICT (user_id, day_of_week, category) DO UPDATE
    SET score = LEAST(100, GREATEST(0, t.score * 0.7 +
          (SELECT s2.avg_weight FROM src s2
           WHERE s2.user_id = EXCLUDED.user_id
             AND s2.dow = EXCLUDED.day_of_week
             AND s2.category = EXCLUDED.category LIMIT 1) * 0.3)),
        interaction_count = t.interaction_count + EXCLUDED.interaction_count,
        last_interaction  = GREATEST(t.last_interaction, EXCLUDED.last_interaction);
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_tag_preferences(_records jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH src AS (
    SELECT
      (r->>'user_id')::uuid         AS user_id,
      r->>'tag'                     AS tag,
      (r->>'avg_weight')::numeric   AS avg_weight,
      (r->>'count')::int            AS cnt,
      (r->>'latest')::timestamptz   AS latest
    FROM jsonb_array_elements(_records) AS r
  )
  INSERT INTO public.user_tag_preferences AS t
    (user_id, tag, score, interaction_count, last_interaction)
  SELECT
    s.user_id, s.tag,
    LEAST(100, GREATEST(0, s.avg_weight)),
    s.cnt, s.latest
  FROM src s
  ON CONFLICT (user_id, tag) DO UPDATE
    SET score = LEAST(100, GREATEST(0, t.score * 0.7 +
          (SELECT s2.avg_weight FROM src s2
           WHERE s2.user_id = EXCLUDED.user_id AND s2.tag = EXCLUDED.tag LIMIT 1) * 0.3)),
        interaction_count = t.interaction_count + EXCLUDED.interaction_count,
        last_interaction  = GREATEST(t.last_interaction, EXCLUDED.last_interaction);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_category_preferences(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_creator_preferences(jsonb)  TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_day_preferences(jsonb)      TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_tag_preferences(jsonb)      TO service_role;

-- 3) Nightly housekeeping for cron/pg_net log tables.
CREATE OR REPLACE FUNCTION public.cleanup_infra_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, cron, net'
AS $$
BEGIN
  BEGIN
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    DELETE FROM net._http_response WHERE created < now() - interval '3 days';
  EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$;

-- 4) Silently drop legacy impression/view inserts on event_interactions.
CREATE OR REPLACE FUNCTION public.guard_event_interactions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IN ('impression', 'view') THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_event_interactions ON public.event_interactions;
CREATE TRIGGER trg_guard_event_interactions
  BEFORE INSERT ON public.event_interactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_interactions();

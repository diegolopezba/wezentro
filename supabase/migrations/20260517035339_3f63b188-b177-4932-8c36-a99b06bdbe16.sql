
-- ============================================================
-- STEP 1: Additional indexes
-- ============================================================

-- Main feed scan: covers is_post branch + cursor pagination
CREATE INDEX IF NOT EXISTS idx_events_feed_post
  ON public.events (is_post, start_datetime DESC, created_at DESC)
  WHERE is_public = true AND deleted_at IS NULL;

-- Collaborative scan: category + score
CREATE INDEX IF NOT EXISTS idx_user_category_prefs_category_score
  ON public.user_category_preferences (category, score DESC);

-- Boost lookups by user
CREATE INDEX IF NOT EXISTS idx_event_interactions_user_type_created
  ON public.event_interactions (user_id, type, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ============================================================
-- STEP 2: Trending scores cache
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trending_scores_cache (
  event_id uuid PRIMARY KEY,
  trending_score numeric NOT NULL DEFAULT 0,
  velocity_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trending_scores_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trending cache readable by everyone" ON public.trending_scores_cache;
CREATE POLICY "Trending cache readable by everyone"
  ON public.trending_scores_cache FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.refresh_trending_scores_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.trending_scores_cache;
  INSERT INTO public.trending_scores_cache (event_id, trending_score, velocity_count, updated_at)
  SELECT
    ei.event_id,
    COALESCE(SUM(
      CASE
        WHEN ei.created_at >= NOW() - INTERVAL '24 hours' THEN
          CASE ei.type
            WHEN 'join' THEN 5
            WHEN 'save' THEN 5
            WHEN 'like' THEN 3
            WHEN 'repost' THEN 3
            WHEN 'click' THEN 1
            ELSE 0
          END
        ELSE 0
      END
    ), 0) AS trending_score,
    COUNT(*) FILTER (
      WHERE ei.created_at >= NOW() - INTERVAL '2 hours'
        AND ei.type IN ('join', 'save', 'like', 'repost')
    ) AS velocity_count,
    now()
  FROM public.event_interactions ei
  WHERE ei.created_at >= NOW() - INTERVAL '24 hours'
    AND ei.type IN ('join', 'save', 'like', 'repost', 'click')
  GROUP BY ei.event_id;
END;
$$;

-- Rewrite get_trending_scores to read from cache (constant time)
CREATE OR REPLACE FUNCTION public.get_trending_scores()
RETURNS TABLE(event_id uuid, trending_score numeric, velocity_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT event_id, trending_score, velocity_count
  FROM public.trending_scores_cache;
$$;

-- Seed once so first reads aren't empty
SELECT public.refresh_trending_scores_cache();

-- ============================================================
-- STEP 3: Collaborative boosts cache
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_collab_boosts_cache (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  boost_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_boosts_user_updated
  ON public.user_collab_boosts_cache (user_id, updated_at DESC);

ALTER TABLE public.user_collab_boosts_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own collab boosts" ON public.user_collab_boosts_cache;
CREATE POLICY "Users can read own collab boosts"
  ON public.user_collab_boosts_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.refresh_user_collab_boosts(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seven_days_ago timestamptz := now() - interval '7 days';
BEGIN
  -- Remove previous cache for this user
  DELETE FROM public.user_collab_boosts_cache WHERE user_id = _user_id;

  WITH my_prefs AS (
    SELECT category, score
    FROM public.user_category_preferences
    WHERE user_id = _user_id
  ),
  similar_users AS (
    SELECT ucp.user_id,
           SUM(LEAST(mp.score, ucp.score)) AS similarity
    FROM public.user_category_preferences ucp
    JOIN my_prefs mp ON mp.category = ucp.category
    WHERE ucp.user_id <> _user_id
      AND ucp.score >= 20
    GROUP BY ucp.user_id
    ORDER BY similarity DESC
    LIMIT 5
  ),
  recent_interactions AS (
    SELECT DISTINCT ei.event_id, ei.user_id
    FROM public.event_interactions ei
    JOIN similar_users su ON su.user_id = ei.user_id
    WHERE ei.created_at >= _seven_days_ago
      AND ei.type IN ('join', 'save', 'like', 'click')
  )
  INSERT INTO public.user_collab_boosts_cache (user_id, event_id, boost_count, updated_at)
  SELECT _user_id, ri.event_id, COUNT(DISTINCT ri.user_id), now()
  FROM recent_interactions ri
  GROUP BY ri.event_id;

  -- Always insert a sentinel row so we know it ran (even with zero results)
  INSERT INTO public.user_collab_boosts_cache (user_id, event_id, boost_count, updated_at)
  VALUES (_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 0, now())
  ON CONFLICT (user_id, event_id) DO UPDATE SET updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_collab_boosts(_user_id uuid)
RETURNS TABLE(event_id uuid, boost_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT c.event_id, c.boost_count
    FROM public.user_collab_boosts_cache c
    WHERE c.user_id = _user_id
      AND c.event_id <> '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;

-- Trigger lazy refresh: client calls this when cache is stale/empty
CREATE OR REPLACE FUNCTION public.ensure_collab_boosts_fresh(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _last_update timestamptz;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT MAX(updated_at) INTO _last_update
  FROM public.user_collab_boosts_cache
  WHERE user_id = _user_id;

  IF _last_update IS NULL OR _last_update < now() - interval '6 hours' THEN
    PERFORM public.refresh_user_collab_boosts(_user_id);
  END IF;
END;
$$;

-- ============================================================
-- STEP 4: Consolidated per-session context RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_for_you_context(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_dow int := EXTRACT(DOW FROM now())::int;
  _result jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'interests', '[]'::jsonb,
      'following_ids', '[]'::jsonb,
      'creator_attendance', '{}'::jsonb,
      'day_of_week_prefs', '{}'::jsonb,
      'tag_prefs', '{}'::jsonb,
      'mutual_follower_ids', '[]'::jsonb,
      'category_prefs', '{}'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'interests', COALESCE((SELECT to_jsonb(p.interests) FROM profiles p WHERE p.id = _user_id), '[]'::jsonb),
    'following_ids', COALESCE(
      (SELECT jsonb_agg(following_id) FROM follows WHERE follower_id = _user_id),
      '[]'::jsonb),
    'creator_attendance', COALESCE(
      (SELECT jsonb_object_agg(creator_id::text, cnt)
       FROM (
         SELECT e.creator_id, COUNT(*) AS cnt
         FROM guestlist_entries ge
         JOIN events e ON e.id = ge.event_id
         WHERE ge.user_id = _user_id AND ge.status = 'approved'
         GROUP BY e.creator_id
       ) ca),
      '{}'::jsonb),
    'day_of_week_prefs', COALESCE(
      (SELECT jsonb_object_agg(category, score)
       FROM user_day_preferences
       WHERE user_id = _user_id AND day_of_week = _today_dow),
      '{}'::jsonb),
    'tag_prefs', COALESCE(
      (SELECT jsonb_object_agg(tag, score)
       FROM user_tag_preferences
       WHERE user_id = _user_id),
      '{}'::jsonb),
    'mutual_follower_ids', COALESCE(
      (SELECT jsonb_agg(p.id)
       FROM profiles p
       WHERE EXISTS (SELECT 1 FROM follows f1 WHERE f1.follower_id = _user_id AND f1.following_id = p.id)
         AND EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = p.id AND f2.following_id = _user_id)),
      '[]'::jsonb),
    'category_prefs', COALESCE(
      (SELECT jsonb_object_agg(category, score)
       FROM user_category_preferences
       WHERE user_id = _user_id),
      '{}'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- ============================================================
-- STEP 5: Schedule trending refresh every 2 minutes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove previous schedule if it exists, then re-add
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-trending-scores-cache');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-trending-scores-cache',
  '*/2 * * * *',
  $$ SELECT public.refresh_trending_scores_cache(); $$
);

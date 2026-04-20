
-- Enable extensions for cron-based lifecycle management
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================================================
-- Table: sponsored_clicks (dedup per viewer per day)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sponsored_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_post_id uuid NOT NULL,
  viewer_id uuid,
  viewer_fingerprint text,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique dedup per authenticated viewer per ad per day
CREATE UNIQUE INDEX IF NOT EXISTS sponsored_clicks_viewer_unique
  ON public.sponsored_clicks (sponsored_post_id, viewer_id, day)
  WHERE viewer_id IS NOT NULL;

-- Unique dedup per guest fingerprint per ad per day
CREATE UNIQUE INDEX IF NOT EXISTS sponsored_clicks_fingerprint_unique
  ON public.sponsored_clicks (sponsored_post_id, viewer_fingerprint, day)
  WHERE viewer_id IS NULL AND viewer_fingerprint IS NOT NULL;

ALTER TABLE public.sponsored_clicks ENABLE ROW LEVEL SECURITY;

-- Only campaign owners can read their click logs
CREATE POLICY "Owners can view own clicks" ON public.sponsored_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sponsored_posts sp
      WHERE sp.id = sponsored_clicks.sponsored_post_id
        AND sp.business_user_id = auth.uid()
    )
  );

-- =========================================================
-- Table: sponsored_daily_spend (per-campaign per-day counter)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sponsored_daily_spend (
  sponsored_post_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  spent numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sponsored_post_id, day)
);

ALTER TABLE public.sponsored_daily_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own daily spend" ON public.sponsored_daily_spend
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sponsored_posts sp
      WHERE sp.id = sponsored_daily_spend.sponsored_post_id
        AND sp.business_user_id = auth.uid()
    )
  );

-- =========================================================
-- Function: increment_sponsored_impressions (with daily budget)
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_sponsored_impressions(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_budget numeric;
  _daily_budget numeric;
  _new_spent numeric;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _today_spent numeric;
BEGIN
  -- Bump lifetime counters; only acts on currently-active campaigns
  UPDATE sponsored_posts
  SET 
    impressions = impressions + 1,
    spent = spent + 0.005
  WHERE id = _post_id AND status = 'active'
  RETURNING total_budget, daily_budget, spent INTO _total_budget, _daily_budget, _new_spent;

  -- If no row updated (paused/completed/etc), nothing to do
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Upsert today's per-campaign counter
  INSERT INTO sponsored_daily_spend (sponsored_post_id, day, spent, impressions, updated_at)
  VALUES (_post_id, _today, 0.005, 1, now())
  ON CONFLICT (sponsored_post_id, day)
  DO UPDATE SET
    spent = sponsored_daily_spend.spent + 0.005,
    impressions = sponsored_daily_spend.impressions + 1,
    updated_at = now()
  RETURNING spent INTO _today_spent;

  -- Enforce total budget
  IF _total_budget IS NOT NULL AND _new_spent >= _total_budget THEN
    UPDATE sponsored_posts SET status = 'paused' WHERE id = _post_id;
    RETURN;
  END IF;

  -- Enforce daily budget
  IF _daily_budget IS NOT NULL AND _today_spent >= _daily_budget THEN
    UPDATE sponsored_posts SET status = 'paused_daily' WHERE id = _post_id;
  END IF;
END;
$$;

-- =========================================================
-- Function: increment_sponsored_clicks (with dedup)
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_sponsored_clicks_v2(
  _post_id uuid,
  _viewer_id uuid DEFAULT NULL,
  _fingerprint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try to log the click (unique index will reject duplicates per day)
  BEGIN
    INSERT INTO sponsored_clicks (sponsored_post_id, viewer_id, viewer_fingerprint)
    VALUES (_post_id, _viewer_id, _fingerprint);
  EXCEPTION WHEN unique_violation THEN
    -- Already counted today
    RETURN;
  END;

  -- Only bump aggregate if log insert succeeded
  UPDATE sponsored_posts
  SET clicks = clicks + 1
  WHERE id = _post_id;
END;
$$;

-- =========================================================
-- Function: get_eligible_sponsored_posts (server-side targeting)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_eligible_sponsored_posts(
  _user_id uuid DEFAULT NULL,
  _lat double precision DEFAULT NULL,
  _lng double precision DEFAULT NULL
)
RETURNS TABLE (
  sponsored_post_id uuid,
  event_id uuid,
  target_categories text[],
  target_radius_km numeric,
  target_gender text,
  target_age_min integer,
  target_age_max integer,
  preference_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _viewer_gender text;
  _viewer_age integer;
  _viewer_interests text[];
BEGIN
  IF _user_id IS NOT NULL THEN
    SELECT 
      gender,
      CASE WHEN birth_date IS NOT NULL 
        THEN EXTRACT(YEAR FROM age(birth_date))::int 
        ELSE NULL 
      END,
      interests
    INTO _viewer_gender, _viewer_age, _viewer_interests
    FROM profiles
    WHERE id = _user_id;
  END IF;

  RETURN QUERY
  SELECT 
    sp.id,
    sp.event_id,
    sp.target_categories,
    sp.target_radius_km,
    sp.target_gender,
    sp.target_age_min,
    sp.target_age_max,
    COALESCE(ucp.score, 0) AS preference_score
  FROM sponsored_posts sp
  JOIN events e ON e.id = sp.event_id AND e.deleted_at IS NULL
  LEFT JOIN user_category_preferences ucp 
    ON ucp.user_id = _user_id AND ucp.category = e.category
  WHERE sp.status = 'active'
    -- Gender filter
    AND (
      sp.target_gender IS NULL 
      OR sp.target_gender = 'all'
      OR (_viewer_gender IS NOT NULL AND lower(_viewer_gender) = lower(sp.target_gender))
    )
    -- Age min
    AND (sp.target_age_min IS NULL OR (_viewer_age IS NOT NULL AND _viewer_age >= sp.target_age_min))
    -- Age max
    AND (sp.target_age_max IS NULL OR (_viewer_age IS NOT NULL AND _viewer_age <= sp.target_age_max))
    -- Categories: viewer's interests must intersect ad's target categories
    AND (
      sp.target_categories IS NULL 
      OR cardinality(sp.target_categories) = 0
      OR (_viewer_interests IS NOT NULL AND _viewer_interests && sp.target_categories)
    )
    -- Radius via Haversine (km)
    AND (
      sp.target_radius_km IS NULL
      OR sp.target_radius_km <= 0
      OR (
        _lat IS NOT NULL AND _lng IS NOT NULL 
        AND e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(_lat)) * cos(radians(e.latitude)) 
              * cos(radians(e.longitude) - radians(_lng))
              + sin(radians(_lat)) * sin(radians(e.latitude))
            ))
          )
        ) <= sp.target_radius_km
      )
    )
  ORDER BY preference_score DESC, random();
END;
$$;

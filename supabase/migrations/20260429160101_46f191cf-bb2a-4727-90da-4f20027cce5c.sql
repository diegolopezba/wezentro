-- Add scheduling fields for sponsored posts (day-of-week + hour-of-day window)
ALTER TABLE public.sponsored_posts
  ADD COLUMN IF NOT EXISTS target_days_of_week int[] NULL,
  ADD COLUMN IF NOT EXISTS target_hour_start int NULL,
  ADD COLUMN IF NOT EXISTS target_hour_end int NULL,
  ADD COLUMN IF NOT EXISTS target_timezone text NOT NULL DEFAULT 'America/La_Paz';

-- Validation trigger (CHECK constraints can't use non-immutable expressions reliably here)
CREATE OR REPLACE FUNCTION public.validate_sponsored_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.target_days_of_week IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.target_days_of_week) AS d WHERE d < 0 OR d > 6
    ) THEN
      RAISE EXCEPTION 'target_days_of_week must contain integers 0..6';
    END IF;
  END IF;

  IF (NEW.target_hour_start IS NULL) <> (NEW.target_hour_end IS NULL) THEN
    RAISE EXCEPTION 'target_hour_start and target_hour_end must both be set or both null';
  END IF;
  IF NEW.target_hour_start IS NOT NULL AND
     (NEW.target_hour_start < 0 OR NEW.target_hour_start > 23
      OR NEW.target_hour_end < 0 OR NEW.target_hour_end > 23) THEN
    RAISE EXCEPTION 'target_hour_start/target_hour_end must be 0..23';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sponsored_schedule ON public.sponsored_posts;
CREATE TRIGGER trg_validate_sponsored_schedule
  BEFORE INSERT OR UPDATE ON public.sponsored_posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_sponsored_schedule();

-- Update eligibility RPC to enforce day/hour windows in advertiser timezone
CREATE OR REPLACE FUNCTION public.get_eligible_sponsored_posts(
  _user_id uuid DEFAULT NULL::uuid,
  _lat double precision DEFAULT NULL::double precision,
  _lng double precision DEFAULT NULL::double precision
)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND (
      sp.target_gender IS NULL
      OR sp.target_gender = 'all'
      OR (_viewer_gender IS NOT NULL AND lower(_viewer_gender) = lower(sp.target_gender))
    )
    AND (sp.target_age_min IS NULL OR (_viewer_age IS NOT NULL AND _viewer_age >= sp.target_age_min))
    AND (sp.target_age_max IS NULL OR (_viewer_age IS NOT NULL AND _viewer_age <= sp.target_age_max))
    AND (
      sp.target_categories IS NULL
      OR cardinality(sp.target_categories) = 0
      OR (_viewer_interests IS NOT NULL AND _viewer_interests && sp.target_categories)
    )
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
    -- Day-of-week filter (advertiser timezone, Sun=0..Sat=6)
    AND (
      sp.target_days_of_week IS NULL
      OR cardinality(sp.target_days_of_week) = 0
      OR EXTRACT(DOW FROM (now() AT TIME ZONE COALESCE(sp.target_timezone, 'America/La_Paz')))::int
         = ANY(sp.target_days_of_week)
    )
    -- Hour-of-day filter (supports overnight windows like 18..2)
    AND (
      sp.target_hour_start IS NULL
      OR sp.target_hour_end IS NULL
      OR (
        CASE
          WHEN sp.target_hour_start <= sp.target_hour_end THEN
            EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(sp.target_timezone, 'America/La_Paz')))::int
              BETWEEN sp.target_hour_start AND sp.target_hour_end
          ELSE
            EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(sp.target_timezone, 'America/La_Paz')))::int >= sp.target_hour_start
            OR EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(sp.target_timezone, 'America/La_Paz')))::int <= sp.target_hour_end
        END
      )
    )
  ORDER BY preference_score DESC, random();
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_sponsored_impressions_batch(_counts jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _today_spent numeric;
  _new_spent numeric;
  _total_budget numeric;
  _daily_budget numeric;
BEGIN
  -- Aggregate incoming counts by post_id (defensive: caller may not group).
  FOR r IN
    SELECT (elem->>'post_id')::uuid AS post_id,
           SUM(GREATEST(1, COALESCE((elem->>'count')::int, 1)))::int AS cnt
    FROM jsonb_array_elements(_counts) AS elem
    GROUP BY (elem->>'post_id')::uuid
  LOOP
    -- Bump lifetime counters in one UPDATE per campaign.
    UPDATE sponsored_posts
    SET impressions = impressions + r.cnt,
        spent = spent + (0.005 * r.cnt)
    WHERE id = r.post_id AND status = 'active'
    RETURNING total_budget, daily_budget, spent
      INTO _total_budget, _daily_budget, _new_spent;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- One upsert per campaign for today's spend counter.
    INSERT INTO sponsored_daily_spend (sponsored_post_id, day, spent, impressions, updated_at)
    VALUES (r.post_id, _today, 0.005 * r.cnt, r.cnt, now())
    ON CONFLICT (sponsored_post_id, day)
    DO UPDATE SET
      spent = sponsored_daily_spend.spent + (0.005 * r.cnt),
      impressions = sponsored_daily_spend.impressions + r.cnt,
      updated_at = now()
    RETURNING spent INTO _today_spent;

    -- Budget enforcement.
    IF _total_budget IS NOT NULL AND _new_spent >= _total_budget THEN
      UPDATE sponsored_posts SET status = 'paused' WHERE id = r.post_id;
    ELSIF _daily_budget IS NOT NULL AND _today_spent >= _daily_budget THEN
      UPDATE sponsored_posts SET status = 'paused_daily' WHERE id = r.post_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sponsored_impressions_batch(jsonb) TO anon, authenticated, service_role;

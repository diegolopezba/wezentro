
-- Increment impressions for a sponsored post
CREATE OR REPLACE FUNCTION public.increment_sponsored_impressions(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE sponsored_posts
  SET impressions = impressions + 1
  WHERE id = _post_id AND status = 'active';
END;
$$;

-- Increment clicks for a sponsored post
CREATE OR REPLACE FUNCTION public.increment_sponsored_clicks(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE sponsored_posts
  SET clicks = clicks + 1
  WHERE id = _post_id AND status = 'active';
END;
$$;

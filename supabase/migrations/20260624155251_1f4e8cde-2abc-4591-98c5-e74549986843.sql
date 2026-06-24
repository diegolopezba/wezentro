CREATE OR REPLACE FUNCTION public.get_event_like_summary(_event_ids uuid[])
RETURNS TABLE(event_id uuid, like_count bigint, viewer_liked boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS event_id,
    COALESCE(agg.like_count, 0) AS like_count,
    COALESCE(agg.viewer_liked, false) AS viewer_liked
  FROM unnest(_event_ids) AS e(id)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS like_count,
      bool_or(el.user_id = auth.uid()) AS viewer_liked
    FROM public.event_likes el
    WHERE el.event_id = e.id
  ) agg ON true;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_like_summary(uuid[]) TO authenticated, anon, service_role;
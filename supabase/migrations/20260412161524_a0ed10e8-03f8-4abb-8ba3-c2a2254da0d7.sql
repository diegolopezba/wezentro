
-- Server-side trending + velocity aggregation
CREATE OR REPLACE FUNCTION public.get_trending_scores()
RETURNS TABLE(event_id uuid, trending_score numeric, velocity_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ) AS velocity_count
  FROM event_interactions ei
  WHERE ei.created_at >= NOW() - INTERVAL '24 hours'
    AND ei.type IN ('join', 'save', 'like', 'repost', 'click')
  GROUP BY ei.event_id
$$;

-- Performance indexes for hot queries
CREATE INDEX IF NOT EXISTS idx_event_interactions_created_type
  ON public.event_interactions (created_at DESC, type);

CREATE INDEX IF NOT EXISTS idx_guestlist_entries_user_status
  ON public.guestlist_entries (user_id, status);

-- Denormalized counters (Pinterest/Meta pattern)
CREATE TABLE IF NOT EXISTS public.event_stats (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  view_count BIGINT NOT NULL DEFAULT 0,
  impression_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_stats TO anon, authenticated;
GRANT ALL ON public.event_stats TO service_role;

ALTER TABLE public.event_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read event stats"
  ON public.event_stats FOR SELECT TO anon, authenticated USING (true);

-- One-shot backfill from history
INSERT INTO public.event_stats (event_id, view_count, impression_count)
SELECT
  event_id,
  COUNT(*) FILTER (WHERE type = 'view')::bigint,
  COUNT(*) FILTER (WHERE type = 'impression')::bigint
FROM public.event_interactions
WHERE type IN ('view', 'impression')
GROUP BY event_id
ON CONFLICT (event_id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  impression_count = EXCLUDED.impression_count,
  updated_at = now();

-- Atomic counter bumps used by the ingest function
CREATE OR REPLACE FUNCTION public.bump_event_stats(
  _event_id UUID,
  _impressions INT DEFAULT 0,
  _views INT DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_stats (event_id, view_count, impression_count, updated_at)
  VALUES (_event_id, GREATEST(_views, 0), GREATEST(_impressions, 0), now())
  ON CONFLICT (event_id) DO UPDATE SET
    view_count = public.event_stats.view_count + EXCLUDED.view_count,
    impression_count = public.event_stats.impression_count + EXCLUDED.impression_count,
    updated_at = now();
EXCEPTION WHEN foreign_key_violation THEN
  -- Event was deleted between client capture and ingest; ignore.
  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bump_event_stats(UUID, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_event_stats(UUID, INT, INT) TO service_role;

-- Switch card-counts reader to the denormalized table
CREATE OR REPLACE FUNCTION public.get_event_card_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, impression_count bigint, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS event_id,
    COALESCE(s.impression_count, 0) AS impression_count,
    COALESCE(s.view_count, 0) AS view_count
  FROM unnest(_event_ids) AS e(id)
  LEFT JOIN public.event_stats s ON s.event_id = e.id;
$$;

-- Nightly: prune impression/view rows older than 90 days. Counters in
-- event_stats are independent and preserved.
CREATE OR REPLACE FUNCTION public.cleanup_old_event_interactions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.event_interactions
  WHERE type IN ('impression', 'view')
    AND created_at < now() - interval '90 days';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_event_interactions() TO service_role;
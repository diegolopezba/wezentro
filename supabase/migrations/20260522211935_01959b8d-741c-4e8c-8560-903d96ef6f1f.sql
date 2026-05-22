CREATE OR REPLACE FUNCTION public.get_event_card_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, impression_count bigint, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id AS event_id,
    COUNT(*) FILTER (WHERE ei.type = 'impression') AS impression_count,
    COUNT(*) FILTER (WHERE ei.type = 'view') AS view_count
  FROM unnest(_event_ids) AS e(id)
  LEFT JOIN public.event_interactions ei ON ei.event_id = e.id
  GROUP BY e.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_card_counts(uuid[]) TO anon, authenticated;
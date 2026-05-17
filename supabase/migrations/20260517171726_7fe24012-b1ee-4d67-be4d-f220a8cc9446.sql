CREATE OR REPLACE FUNCTION public.get_event_view_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ei.event_id, COUNT(*)::bigint AS view_count
  FROM public.event_interactions ei
  WHERE ei.event_id = ANY(_event_ids)
    AND ei.type = 'view'
  GROUP BY ei.event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_view_counts(uuid[]) TO anon, authenticated;
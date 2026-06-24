-- Web vitals TTL cleanup: keep 30 days
CREATE OR REPLACE FUNCTION public.cleanup_web_vitals()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.web_vitals WHERE created_at < now() - interval '30 days';
$$;

-- Batched likes-by-viewer check: 1 query for many event ids
CREATE OR REPLACE FUNCTION public.get_viewer_liked_events(_event_ids uuid[])
RETURNS TABLE(event_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT el.event_id
  FROM public.event_likes el
  WHERE el.user_id = auth.uid()
    AND el.event_id = ANY(_event_ids);
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_web_vitals() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_viewer_liked_events(uuid[]) TO authenticated, anon, service_role;
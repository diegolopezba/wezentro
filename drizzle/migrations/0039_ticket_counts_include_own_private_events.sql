CREATE OR REPLACE FUNCTION public.get_event_ticket_counts(_event_ids uuid[])
 RETURNS TABLE(event_id uuid, tickets bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.event_id, COUNT(*)::bigint
  FROM public.guestlist_entries g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.event_id = ANY(_event_ids)
    AND (e.is_public = true OR e.creator_id = auth.uid())
    AND e.deleted_at IS NULL
    AND g.status IN ('approved','checked_in')
  GROUP BY g.event_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_ticket_counts(uuid[]) TO anon, authenticated, service_role;
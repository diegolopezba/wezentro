CREATE OR REPLACE FUNCTION public.get_creator_sales_by_event()
 RETURNS TABLE(event_id uuid, title text, start_datetime timestamp with time zone, image_url text, tickets_sold bigint, revenue numeric, attributed_tickets bigint, attributed_revenue numeric, capacity bigint, checked_in bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id,
    e.title,
    e.start_datetime,
    e.image_url,
    COALESCE(ps.cnt, 0)::bigint,
    COALESCE(ps.rev, 0)::numeric,
    COALESCE(ps.acnt, 0)::bigint,
    COALESCE(ps.arev, 0)::numeric,
    COALESCE(tt.cap, e.max_guestlist_capacity, 0)::bigint,
    COALESCE(gl.ci, 0)::bigint
  FROM public.events e
  LEFT JOIN LATERAL (
    SELECT COUNT(*) cnt,
           SUM(p.amount) rev,
           COUNT(*) FILTER (WHERE p.promoter_id IS NOT NULL) acnt,
           SUM(p.amount) FILTER (WHERE p.promoter_id IS NOT NULL) arev
    FROM public.payment_sessions p
    WHERE p.event_id = e.id AND p.status = 'confirmed'
  ) ps ON true
  LEFT JOIN LATERAL (
    SELECT SUM(t.capacity) cap FROM public.ticket_tiers t WHERE t.event_id = e.id
  ) tt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) ci FROM public.guestlist_entries g
    WHERE g.event_id = e.id AND g.status = 'checked_in'
  ) gl ON true
  WHERE e.creator_id = auth.uid()
    AND e.deleted_at IS NULL
    AND (
      COALESCE(e.price, 0) > 0
      OR EXISTS (SELECT 1 FROM public.ticket_tiers t2 WHERE t2.event_id = e.id AND t2.price > 0)
      OR COALESCE(ps.cnt, 0) > 0
    )
  ORDER BY COALESCE(ps.rev, 0) DESC, e.start_datetime DESC;
$function$;
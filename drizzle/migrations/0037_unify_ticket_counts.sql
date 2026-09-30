-- Unify "tickets sold" across dashboards: count actual issued tickets
-- (guestlist entries) and ticket quantities per payment, not payment rows.

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
    GREATEST(COALESCE(ps.qty, 0), COALESCE(gl.entries, 0))::bigint,
    COALESCE(ps.rev, 0)::numeric,
    COALESCE(ps.aqty, 0)::bigint,
    COALESCE(ps.arev, 0)::numeric,
    COALESCE(tt.cap, e.max_guestlist_capacity, 0)::bigint,
    COALESCE(gl.ci, 0)::bigint
  FROM public.events e
  LEFT JOIN LATERAL (
    SELECT COUNT(*) cnt,
           SUM(COALESCE(p.quantity, 1)) qty,
           SUM(p.amount) rev,
           SUM(COALESCE(p.quantity, 1)) FILTER (WHERE p.promoter_id IS NOT NULL) aqty,
           SUM(p.amount) FILTER (WHERE p.promoter_id IS NOT NULL) arev
    FROM public.payment_sessions p
    WHERE p.event_id = e.id AND p.status = 'confirmed'
  ) ps ON true
  LEFT JOIN LATERAL (
    SELECT SUM(t.capacity) cap FROM public.ticket_tiers t WHERE t.event_id = e.id
  ) tt ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE g.status = 'checked_in') ci,
           COUNT(*) FILTER (WHERE g.status IN ('approved','checked_in')) entries
    FROM public.guestlist_entries g
    WHERE g.event_id = e.id
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

CREATE OR REPLACE FUNCTION public.get_creator_sales_monthly()
 RETURNS TABLE(bucket date, revenue numeric, tickets bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT date_trunc('month', COALESCE(p.confirmed_at, p.created_at))::date AS bucket,
         SUM(p.amount)::numeric,
         SUM(COALESCE(p.quantity, 1))::bigint
  FROM public.payment_sessions p
  JOIN public.events e ON e.id = p.event_id
  WHERE e.creator_id = auth.uid() AND p.status = 'confirmed'
  GROUP BY 1
  ORDER BY 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_creator_promoter_leaderboard()
 RETURNS TABLE(promoter_id uuid, name text, short_code text, event_id uuid, event_title text, clicks bigint, tickets_sold bigint, revenue_bs numeric, gl_approved bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ep.id, ep.name, ep.short_code, e.id, e.title,
    COALESCE((SELECT COUNT(*) FROM public.promoter_clicks pc WHERE pc.promoter_id = ep.id), 0)::bigint,
    COALESCE((SELECT SUM(COALESCE(ps.quantity, 1)) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(ps.amount) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id AND ge.status IN ('approved','checked_in')), 0)::bigint
  FROM public.event_promoters ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE e.creator_id = auth.uid();
$function$;

-- Public per-event issued-ticket count, usable by anon + authenticated so the
-- feed card and the event detail page agree on one number.
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
    AND e.is_public = true
    AND e.deleted_at IS NULL
    AND g.status IN ('approved','checked_in')
  GROUP BY g.event_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_ticket_counts(uuid[]) TO anon, authenticated, service_role;

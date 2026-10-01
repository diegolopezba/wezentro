CREATE OR REPLACE FUNCTION public.get_event_promoter_stats(_event_id uuid)
 RETURNS TABLE(promoter_id uuid, name text, short_code text, is_active boolean, clicks bigint, gl_requests bigint, gl_approved bigint, checked_in bigint, tickets_sold bigint, revenue_bs numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT ep.id, ep.name, ep.short_code, ep.is_active,
    COALESCE((SELECT COUNT(*) FROM public.promoter_clicks pc WHERE pc.promoter_id = ep.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id AND ge.status IN ('approved','checked_in')), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id AND ge.status = 'checked_in'), 0)::bigint,
    COALESCE((SELECT SUM(COALESCE(ps.quantity, 1)) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(ps.amount) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric
  FROM public.event_promoters ep
  WHERE ep.event_id = _event_id
  ORDER BY ep.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_event_promoter_totals(_event_id uuid)
 RETURNS TABLE(total_tickets bigint, attributed_tickets bigint, total_revenue numeric, attributed_revenue numeric, total_gl bigint, attributed_gl bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(COALESCE(quantity, 1)) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(COALESCE(quantity, 1)) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed' AND promoter_id IS NOT NULL), 0)::bigint,
    COALESCE((SELECT SUM(amount) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed'), 0)::numeric,
    COALESCE((SELECT SUM(amount) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed' AND promoter_id IS NOT NULL), 0)::numeric,
    (SELECT COUNT(*) FROM public.guestlist_entries WHERE event_id = _event_id)::bigint,
    (SELECT COUNT(*) FROM public.guestlist_entries WHERE event_id = _event_id AND promoter_id IS NOT NULL)::bigint;
END;
$function$;

UPDATE public.guestlist_entries ge
SET promoter_id = ps.promoter_id
FROM public.payment_sessions ps
WHERE ge.payment_session_id = ps.id
  AND ps.promoter_id IS NOT NULL
  AND ge.promoter_id IS NULL;
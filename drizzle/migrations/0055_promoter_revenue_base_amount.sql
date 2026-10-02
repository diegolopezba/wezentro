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
    COALESCE((SELECT SUM(COALESCE(ps.base_amount, ps.amount)) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric
  FROM public.event_promoters ep
  WHERE ep.event_id = _event_id
  ORDER BY ep.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_creator_promoter_leaderboard()
 RETURNS TABLE(promoter_id uuid, name text, short_code text, event_id uuid, event_title text, clicks bigint, tickets_sold bigint, revenue_bs numeric, gl_approved bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT ep.id, ep.name, ep.short_code, e.id, e.title,
    COALESCE((SELECT COUNT(*) FROM public.promoter_clicks pc WHERE pc.promoter_id = ep.id), 0)::bigint,
    COALESCE((SELECT SUM(COALESCE(ps.quantity, 1)) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(COALESCE(ps.base_amount, ps.amount)) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id AND ge.status IN ('approved','checked_in')), 0)::bigint
  FROM public.event_promoters ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE e.creator_id = auth.uid();
$function$;
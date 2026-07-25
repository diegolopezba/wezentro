
CREATE OR REPLACE FUNCTION public.get_creator_sales_by_event()
RETURNS TABLE(
  event_id uuid,
  title text,
  start_datetime timestamptz,
  image_url text,
  tickets_sold bigint,
  revenue numeric,
  attributed_tickets bigint,
  attributed_revenue numeric,
  capacity bigint,
  checked_in bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id,
    e.title,
    e.start_datetime,
    e.image_url,
    COALESCE(ps.cnt, 0)::bigint,
    COALESCE(ps.rev, 0)::numeric,
    COALESCE(ps.acnt, 0)::bigint,
    COALESCE(ps.arev, 0)::numeric,
    COALESCE(tt.cap, 0)::bigint,
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
    AND EXISTS (SELECT 1 FROM public.ticket_tiers t2 WHERE t2.event_id = e.id AND t2.price > 0)
  ORDER BY COALESCE(ps.rev, 0) DESC, e.start_datetime DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_sales_monthly()
RETURNS TABLE(bucket date, revenue numeric, tickets bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT date_trunc('month', COALESCE(p.confirmed_at, p.created_at))::date AS bucket,
         SUM(p.amount)::numeric,
         COUNT(*)::bigint
  FROM public.payment_sessions p
  JOIN public.events e ON e.id = p.event_id
  WHERE e.creator_id = auth.uid() AND p.status = 'confirmed'
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_promoter_leaderboard()
RETURNS TABLE(
  promoter_id uuid,
  name text,
  short_code text,
  event_id uuid,
  event_title text,
  clicks bigint,
  tickets_sold bigint,
  revenue_bs numeric,
  gl_approved bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ep.id, ep.name, ep.short_code, e.id, e.title,
    COALESCE((SELECT COUNT(*) FROM public.promoter_clicks pc WHERE pc.promoter_id = ep.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(ps.amount) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM public.guestlist_entries ge WHERE ge.promoter_id = ep.id AND ge.status IN ('approved','checked_in')), 0)::bigint
  FROM public.event_promoters ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE e.creator_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_event_payment_status_breakdown(_event_id uuid)
RETURNS TABLE(status text, count bigint, amount numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT p.status, COUNT(*)::bigint, COALESCE(SUM(p.amount), 0)::numeric
  FROM public.payment_sessions p
  WHERE p.event_id = _event_id
  GROUP BY p.status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_creator_sales_by_event() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_creator_sales_monthly() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_creator_promoter_leaderboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_event_payment_status_breakdown(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_creator_sales_by_event() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_sales_monthly() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_promoter_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_payment_status_breakdown(uuid) TO authenticated;

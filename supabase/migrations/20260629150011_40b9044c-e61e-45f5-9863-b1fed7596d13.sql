
CREATE TABLE public.event_promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, short_code)
);
CREATE INDEX idx_event_promoters_event ON public.event_promoters(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_promoters TO authenticated;
GRANT ALL ON public.event_promoters TO service_role;

ALTER TABLE public.event_promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creator manages promoters"
  ON public.event_promoters FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

CREATE TABLE public.promoter_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.event_promoters(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  viewer_id uuid,
  viewer_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  click_day date NOT NULL GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);
CREATE INDEX idx_promoter_clicks_promoter ON public.promoter_clicks(promoter_id);
CREATE INDEX idx_promoter_clicks_event ON public.promoter_clicks(event_id);
CREATE UNIQUE INDEX promoter_clicks_dedupe_user_day
  ON public.promoter_clicks(promoter_id, viewer_id, click_day)
  WHERE viewer_id IS NOT NULL;
CREATE UNIQUE INDEX promoter_clicks_dedupe_fp_day
  ON public.promoter_clicks(promoter_id, viewer_fingerprint, click_day)
  WHERE viewer_id IS NULL AND viewer_fingerprint IS NOT NULL;

GRANT SELECT ON public.promoter_clicks TO authenticated;
GRANT ALL ON public.promoter_clicks TO service_role;

ALTER TABLE public.promoter_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creator reads clicks"
  ON public.promoter_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

ALTER TABLE public.guestlist_entries ADD COLUMN promoter_id uuid REFERENCES public.event_promoters(id) ON DELETE SET NULL;
ALTER TABLE public.payment_sessions ADD COLUMN promoter_id uuid REFERENCES public.event_promoters(id) ON DELETE SET NULL;
CREATE INDEX idx_guestlist_entries_promoter ON public.guestlist_entries(promoter_id) WHERE promoter_id IS NOT NULL;
CREATE INDEX idx_payment_sessions_promoter ON public.payment_sessions(promoter_id) WHERE promoter_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_promoter(_event_id uuid, _code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.event_promoters
  WHERE event_id = _event_id AND short_code = _code AND is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_promoter(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_promoter_click(_promoter_id uuid, _fingerprint text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _event uuid;
  _viewer uuid := auth.uid();
BEGIN
  SELECT event_id INTO _event FROM public.event_promoters WHERE id = _promoter_id AND is_active = true;
  IF _event IS NULL THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.promoter_clicks (promoter_id, event_id, viewer_id, viewer_fingerprint)
    VALUES (_promoter_id, _event, _viewer, CASE WHEN _viewer IS NULL THEN _fingerprint ELSE NULL END);
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_promoter_click(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_event_promoter_stats(_event_id uuid)
RETURNS TABLE(
  promoter_id uuid, name text, short_code text, is_active boolean,
  clicks bigint, gl_requests bigint, gl_approved bigint, checked_in bigint,
  tickets_sold bigint, revenue_bs numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
    COALESCE((SELECT COUNT(*) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::bigint,
    COALESCE((SELECT SUM(ps.amount) FROM public.payment_sessions ps WHERE ps.promoter_id = ep.id AND ps.status = 'confirmed'), 0)::numeric
  FROM public.event_promoters ep
  WHERE ep.event_id = _event_id
  ORDER BY ep.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_promoter_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_ticket_breakdown(_event_id uuid)
RETURNS TABLE(tier_id uuid, name text, price numeric, capacity integer, sold integer, revenue_bs numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT tt.id, tt.name, tt.price, tt.capacity, tt.sold_count, (tt.price * tt.sold_count)::numeric
  FROM public.ticket_tiers tt
  WHERE tt.event_id = _event_id AND tt.is_active = true
  ORDER BY tt.display_order ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_ticket_breakdown(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_promoter_totals(_event_id uuid)
RETURNS TABLE(
  total_tickets bigint, attributed_tickets bigint,
  total_revenue numeric, attributed_revenue numeric,
  total_gl bigint, attributed_gl bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed')::bigint,
    (SELECT COUNT(*) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed' AND promoter_id IS NOT NULL)::bigint,
    COALESCE((SELECT SUM(amount) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed'), 0)::numeric,
    COALESCE((SELECT SUM(amount) FROM public.payment_sessions WHERE event_id = _event_id AND status = 'confirmed' AND promoter_id IS NOT NULL), 0)::numeric,
    (SELECT COUNT(*) FROM public.guestlist_entries WHERE event_id = _event_id)::bigint,
    (SELECT COUNT(*) FROM public.guestlist_entries WHERE event_id = _event_id AND promoter_id IS NOT NULL)::bigint;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_promoter_totals(uuid) TO authenticated;

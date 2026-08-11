-- ENUM
CREATE TYPE public.venue_area_type AS ENUM ('table', 'lounge', 'long_table', 'section', 'general_admission');

-- venue_layouts
CREATE TABLE public.venue_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canvas_width INTEGER NOT NULL DEFAULT 1000,
  canvas_height INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_layouts TO authenticated;
GRANT ALL ON public.venue_layouts TO service_role;
ALTER TABLE public.venue_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their layouts" ON public.venue_layouts
  FOR ALL TO authenticated USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE INDEX idx_venue_layouts_business ON public.venue_layouts(business_id);

-- venue_layout_areas
CREATE TABLE public.venue_layout_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.venue_layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_type public.venue_area_type NOT NULL DEFAULT 'table',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 100,
  height NUMERIC NOT NULL DEFAULT 100,
  rotation NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#E60023',
  display_order INTEGER NOT NULL DEFAULT 0,
  default_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_layout_areas TO authenticated;
GRANT ALL ON public.venue_layout_areas TO service_role;
ALTER TABLE public.venue_layout_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their layout areas" ON public.venue_layout_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venue_layouts l WHERE l.id = layout_id AND l.business_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.venue_layouts l WHERE l.id = layout_id AND l.business_id = auth.uid()));
CREATE INDEX idx_venue_layout_areas_layout ON public.venue_layout_areas(layout_id);

-- event_areas
CREATE TABLE public.event_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  source_layout_area_id UUID REFERENCES public.venue_layout_areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  area_type public.venue_area_type NOT NULL DEFAULT 'table',
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC NOT NULL DEFAULT 0,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 100,
  height NUMERIC NOT NULL DEFAULT 100,
  rotation NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#E60023',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_areas TO authenticated;
GRANT SELECT ON public.event_areas TO anon;
GRANT ALL ON public.event_areas TO service_role;
ALTER TABLE public.event_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view event areas" ON public.event_areas FOR SELECT USING (true);
CREATE POLICY "Event owners manage their event areas" ON public.event_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));
CREATE INDEX idx_event_areas_event ON public.event_areas(event_id);

-- area_bookings
CREATE TABLE public.area_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_area_id UUID NOT NULL REFERENCES public.event_areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size > 0),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'confirmed', 'cancelled')),
  hold_expires_at TIMESTAMPTZ,
  payment_session_id UUID REFERENCES public.payment_sessions(id) ON DELETE SET NULL,
  guestlist_entry_id UUID REFERENCES public.guestlist_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.area_bookings TO authenticated;
GRANT ALL ON public.area_bookings TO service_role;
ALTER TABLE public.area_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own bookings" ON public.area_bookings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Event owners view bookings for their events" ON public.area_bookings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.event_areas a
      JOIN public.events e ON e.id = a.event_id
      WHERE a.id = event_area_id AND e.creator_id = auth.uid()
    )
  );
CREATE INDEX idx_area_bookings_area_status ON public.area_bookings(event_area_id, status);
CREATE INDEX idx_area_bookings_user ON public.area_bookings(user_id);

-- updated_at triggers
CREATE TRIGGER update_venue_layouts_updated_at BEFORE UPDATE ON public.venue_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_venue_layout_areas_updated_at BEFORE UPDATE ON public.venue_layout_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_areas_updated_at BEFORE UPDATE ON public.event_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_area_bookings_updated_at BEFORE UPDATE ON public.area_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payment session linkage
ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS event_area_id UUID REFERENCES public.event_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_size INTEGER;

-- Availability read
CREATE OR REPLACE FUNCTION public.get_event_area_availability(_event_id UUID)
RETURNS TABLE (
  event_area_id UUID,
  capacity INTEGER,
  is_exclusive BOOLEAN,
  taken INTEGER,
  remaining INTEGER,
  state TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.capacity,
    a.is_exclusive,
    COALESCE(b.taken, 0)::int,
    GREATEST(a.capacity - COALESCE(b.taken, 0), 0)::int,
    CASE
      WHEN a.is_exclusive AND COALESCE(b.cnt, 0) > 0 THEN 'unavailable'
      WHEN NOT a.is_exclusive AND COALESCE(b.taken, 0) >= a.capacity THEN 'unavailable'
      WHEN NOT a.is_exclusive AND COALESCE(b.taken, 0) > 0 THEN 'partial'
      ELSE 'available'
    END
  FROM public.event_areas a
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt, COALESCE(SUM(ab.party_size), 0) AS taken
    FROM public.area_bookings ab
    WHERE ab.event_area_id = a.id
      AND (ab.status = 'confirmed'
           OR (ab.status = 'held' AND (ab.hold_expires_at IS NULL OR ab.hold_expires_at > now())))
  ) b ON true
  WHERE a.event_id = _event_id AND a.is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_area_availability(UUID) TO anon, authenticated, service_role;

-- Atomic hold
CREATE OR REPLACE FUNCTION public.hold_event_area(_event_area_id UUID, _party_size INTEGER)
RETURNS public.area_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _area public.event_areas;
  _uid UUID := auth.uid();
  _cnt INTEGER;
  _taken INTEGER;
  _booking public.area_bookings;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF _party_size IS NULL OR _party_size < 1 THEN
    RAISE EXCEPTION 'invalid_party_size' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO _area FROM public.event_areas WHERE id = _event_area_id FOR UPDATE;
  IF NOT FOUND OR NOT _area.is_active THEN
    RAISE EXCEPTION 'area_not_available' USING ERRCODE = 'P0002';
  END IF;

  -- Release this user's own stale holds on this area first
  UPDATE public.area_bookings
     SET status = 'cancelled'
   WHERE event_area_id = _event_area_id
     AND status = 'held'
     AND hold_expires_at IS NOT NULL
     AND hold_expires_at <= now();

  SELECT COUNT(*), COALESCE(SUM(party_size), 0)
    INTO _cnt, _taken
  FROM public.area_bookings
  WHERE event_area_id = _event_area_id
    AND (status = 'confirmed'
         OR (status = 'held' AND (hold_expires_at IS NULL OR hold_expires_at > now())));

  IF _area.is_exclusive THEN
    IF _cnt > 0 THEN
      RAISE EXCEPTION 'area_taken' USING ERRCODE = '23505';
    END IF;
  ELSE
    IF _taken + _party_size > _area.capacity THEN
      RAISE EXCEPTION 'area_capacity_exceeded' USING ERRCODE = '23505';
    END IF;
  END IF;

  INSERT INTO public.area_bookings (event_area_id, user_id, party_size, status, hold_expires_at)
  VALUES (_event_area_id, _uid, LEAST(_party_size, _area.capacity), 'held', now() + interval '10 minutes')
  RETURNING * INTO _booking;

  RETURN _booking;
END;
$$;
GRANT EXECUTE ON FUNCTION public.hold_event_area(UUID, INTEGER) TO authenticated, service_role;

-- Cleanup of expired holds
CREATE OR REPLACE FUNCTION public.cleanup_expired_area_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n INTEGER;
BEGIN
  UPDATE public.area_bookings
     SET status = 'cancelled'
   WHERE status = 'held'
     AND hold_expires_at IS NOT NULL
     AND hold_expires_at <= now() - interval '1 minute';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_area_holds() TO service_role;
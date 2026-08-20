-- ========================= EXPERIENCES =========================
CREATE TABLE public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  duration_minutes integer NOT NULL DEFAULT 60,
  location_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT SELECT ON public.experiences TO anon;
GRANT ALL ON public.experiences TO service_role;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiences_public_read" ON public.experiences FOR SELECT USING (true);
CREATE POLICY "experiences_owner_write" ON public.experiences FOR ALL TO authenticated
  USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE INDEX idx_experiences_business ON public.experiences(business_id);
CREATE TRIGGER trg_experiences_updated BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper: is the current user the owner of this experience?
CREATE OR REPLACE FUNCTION public.owns_experience(_experience_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = _experience_id AND e.business_id = auth.uid());
$$;

-- ========================= SEGMENTS =========================
CREATE TABLE public.experience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  max_per_booking integer,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_segments TO authenticated;
GRANT SELECT ON public.experience_segments TO anon;
GRANT ALL ON public.experience_segments TO service_role;
ALTER TABLE public.experience_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_segments_public_read" ON public.experience_segments FOR SELECT USING (true);
CREATE POLICY "experience_segments_owner_write" ON public.experience_segments FOR ALL TO authenticated
  USING (public.owns_experience(experience_id)) WITH CHECK (public.owns_experience(experience_id));
CREATE INDEX idx_experience_segments_exp ON public.experience_segments(experience_id);

-- ========================= SCHEDULES =========================
CREATE TABLE public.experience_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  slot_interval_minutes integer NOT NULL DEFAULT 60,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_schedules TO authenticated;
GRANT SELECT ON public.experience_schedules TO anon;
GRANT ALL ON public.experience_schedules TO service_role;
ALTER TABLE public.experience_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_schedules_public_read" ON public.experience_schedules FOR SELECT USING (true);
CREATE POLICY "experience_schedules_owner_write" ON public.experience_schedules FOR ALL TO authenticated
  USING (public.owns_experience(experience_id)) WITH CHECK (public.owns_experience(experience_id));
CREATE INDEX idx_experience_schedules_exp ON public.experience_schedules(experience_id, weekday);

-- ========================= BLACKOUTS =========================
CREATE TABLE public.experience_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  blackout_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experience_id, blackout_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_blackouts TO authenticated;
GRANT SELECT ON public.experience_blackouts TO anon;
GRANT ALL ON public.experience_blackouts TO service_role;
ALTER TABLE public.experience_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_blackouts_public_read" ON public.experience_blackouts FOR SELECT USING (true);
CREATE POLICY "experience_blackouts_owner_write" ON public.experience_blackouts FOR ALL TO authenticated
  USING (public.owns_experience(experience_id)) WITH CHECK (public.owns_experience(experience_id));

-- ========================= POLICIES =========================
CREATE TABLE public.experience_policies (
  experience_id uuid PRIMARY KEY REFERENCES public.experiences(id) ON DELETE CASCADE,
  spots_per_slot integer NOT NULL DEFAULT 10,
  min_lead_minutes integer NOT NULL DEFAULT 60,
  cancellation_window_hours integer NOT NULL DEFAULT 24,
  max_per_booking integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_policies TO authenticated;
GRANT SELECT ON public.experience_policies TO anon;
GRANT ALL ON public.experience_policies TO service_role;
ALTER TABLE public.experience_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_policies_public_read" ON public.experience_policies FOR SELECT USING (true);
CREATE POLICY "experience_policies_owner_write" ON public.experience_policies FOR ALL TO authenticated
  USING (public.owns_experience(experience_id)) WITH CHECK (public.owns_experience(experience_id));

-- ========================= BOOKINGS =========================
CREATE TABLE public.experience_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.experience_segments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  notes text,
  payment_session_id uuid,
  check_in_token uuid NOT NULL DEFAULT gen_random_uuid(),
  hold_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_bookings TO authenticated;
GRANT ALL ON public.experience_bookings TO service_role;
ALTER TABLE public.experience_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_bookings_read" ON public.experience_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.owns_experience(experience_id));
CREATE POLICY "experience_bookings_owner_update" ON public.experience_bookings FOR UPDATE TO authenticated
  USING (public.owns_experience(experience_id)) WITH CHECK (public.owns_experience(experience_id));
CREATE INDEX idx_experience_bookings_slot ON public.experience_bookings(experience_id, booking_date, booking_time);
CREATE INDEX idx_experience_bookings_user ON public.experience_bookings(user_id, booking_date);
CREATE TRIGGER trg_experience_bookings_updated BEFORE UPDATE ON public.experience_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.experience_booking_guests (
  booking_id uuid NOT NULL REFERENCES public.experience_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.experience_booking_guests TO authenticated;
GRANT ALL ON public.experience_booking_guests TO service_role;
ALTER TABLE public.experience_booking_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experience_booking_guests_read" ON public.experience_booking_guests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.experience_bookings b
      WHERE b.id = booking_id AND (b.user_id = auth.uid() OR public.owns_experience(b.experience_id))
    )
  );

-- ========================= LINKS =========================
ALTER TABLE public.events ADD COLUMN experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL;
ALTER TABLE public.payment_sessions ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.payment_sessions ADD COLUMN experience_booking_id uuid REFERENCES public.experience_bookings(id) ON DELETE SET NULL;

-- ========================= AVAILABILITY =========================
CREATE OR REPLACE FUNCTION public.get_experience_availability(
  _experience_id uuid,
  _date date,
  _quantity integer DEFAULT 1
)
RETURNS TABLE (slot_time time, status text, spots_left integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_spots integer;
  v_lead integer;
  v_active boolean;
  v_weekday smallint;
BEGIN
  SELECT e.is_active INTO v_active FROM public.experiences e WHERE e.id = _experience_id;
  IF v_active IS NOT TRUE THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.experience_blackouts b
             WHERE b.experience_id = _experience_id AND b.blackout_date = _date) THEN
    RETURN;
  END IF;

  SELECT COALESCE(p.spots_per_slot, 10), COALESCE(p.min_lead_minutes, 60)
    INTO v_spots, v_lead
  FROM public.experience_policies p WHERE p.experience_id = _experience_id;
  v_spots := COALESCE(v_spots, 10);
  v_lead := COALESCE(v_lead, 60);

  v_weekday := EXTRACT(DOW FROM _date)::smallint;

  RETURN QUERY
  WITH shifts AS (
    SELECT s.start_time, s.end_time, GREATEST(s.slot_interval_minutes, 5) AS step
    FROM public.experience_schedules s
    WHERE s.experience_id = _experience_id
      AND s.weekday = v_weekday
      AND s.is_closed = false
  ),
  slots AS (
    SELECT DISTINCT (gs)::time AS t
    FROM shifts sh,
    LATERAL generate_series(
      (_date + sh.start_time)::timestamp,
      (_date + sh.end_time)::timestamp,
      make_interval(mins => sh.step)
    ) gs
    WHERE (gs)::time <= sh.end_time
  ),
  booked AS (
    SELECT b.booking_time AS t, SUM(b.quantity)::integer AS taken
    FROM public.experience_bookings b
    WHERE b.experience_id = _experience_id
      AND b.booking_date = _date
      AND (
        b.status IN ('confirmed', 'completed', 'seated')
        OR (b.status = 'pending_payment' AND b.hold_expires_at > now())
      )
    GROUP BY b.booking_time
  )
  SELECT
    s.t,
    CASE
      WHEN GREATEST(v_spots - COALESCE(bk.taken, 0), 0) < GREATEST(_quantity, 1) THEN 'full'
      WHEN GREATEST(v_spots - COALESCE(bk.taken, 0), 0) <= GREATEST((v_spots * 0.25)::int, 1) THEN 'limited'
      ELSE 'available'
    END::text,
    GREATEST(v_spots - COALESCE(bk.taken, 0), 0)::integer
  FROM slots s
  LEFT JOIN booked bk ON bk.t = s.t
  WHERE (_date + s.t) >= (now() AT TIME ZONE 'UTC' + make_interval(mins => v_lead))
  ORDER BY s.t;
END;
$$;

-- ========================= CREATE BOOKING =========================
CREATE OR REPLACE FUNCTION public.create_experience_booking(
  _experience_id uuid,
  _segment_id uuid,
  _date date,
  _time time,
  _quantity integer,
  _notes text DEFAULT NULL,
  _guest_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_spots integer;
  v_max integer;
  v_taken integer;
  v_price numeric(10,2);
  v_booking_id uuid;
  g uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Necesitás iniciar sesión'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = _experience_id AND e.is_active) THEN
    RAISE EXCEPTION 'Esta experiencia no está disponible';
  END IF;

  SELECT COALESCE(spots_per_slot, 10), COALESCE(max_per_booking, 10)
    INTO v_spots, v_max
  FROM public.experience_policies WHERE experience_id = _experience_id;
  v_spots := COALESCE(v_spots, 10);
  v_max := COALESCE(v_max, 10);

  IF _quantity > v_max THEN
    RAISE EXCEPTION 'Máximo % lugares por reserva', v_max;
  END IF;

  SELECT price INTO v_price
  FROM public.experience_segments
  WHERE id = _segment_id AND experience_id = _experience_id AND is_active;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Elegí una opción válida'; END IF;

  -- serialize concurrent bookings for this experience/slot
  PERFORM pg_advisory_xact_lock(hashtext(_experience_id::text || _date::text || _time::text));

  SELECT COALESCE(SUM(quantity), 0)::integer INTO v_taken
  FROM public.experience_bookings
  WHERE experience_id = _experience_id
    AND booking_date = _date
    AND booking_time = _time
    AND (status IN ('confirmed','completed','seated')
         OR (status = 'pending_payment' AND hold_expires_at > now()));

  IF v_taken + _quantity > v_spots THEN
    RAISE EXCEPTION 'Ya no quedan lugares en este horario';
  END IF;

  INSERT INTO public.experience_bookings (
    experience_id, segment_id, user_id, booking_date, booking_time,
    quantity, amount, status, notes, hold_expires_at
  ) VALUES (
    _experience_id, _segment_id, v_user, _date, _time,
    _quantity, ROUND(v_price * _quantity, 2), 'pending_payment', _notes, now() + interval '20 minutes'
  ) RETURNING id INTO v_booking_id;

  IF _guest_ids IS NOT NULL THEN
    FOREACH g IN ARRAY _guest_ids LOOP
      IF g IS NOT NULL AND g <> v_user THEN
        INSERT INTO public.experience_booking_guests (booking_id, user_id)
        VALUES (v_booking_id, g) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_booking_id;
END;
$$;

-- ========================= STATUS =========================
CREATE OR REPLACE FUNCTION public.set_experience_booking_status(
  _booking_id uuid,
  _status text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_booker uuid;
BEGIN
  IF _status NOT IN ('confirmed','seated','completed','cancelled','no_show') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT e.business_id, b.user_id INTO v_owner, v_booker
  FROM public.experience_bookings b
  JOIN public.experiences e ON e.id = b.experience_id
  WHERE b.id = _booking_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  IF v_user <> v_owner AND NOT (v_user = v_booker AND _status = 'cancelled') THEN
    RAISE EXCEPTION 'No tenés permiso para esta acción';
  END IF;

  UPDATE public.experience_bookings
  SET status = _status,
      hold_expires_at = NULL
  WHERE id = _booking_id;
END;
$$;

-- 1. Tables inventory
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  seats integer NOT NULL DEFAULT 2,
  zone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurant_tables_business ON public.restaurant_tables(business_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tables" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "Business manages own tables" ON public.restaurant_tables FOR ALL
  USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE TRIGGER trg_restaurant_tables_updated BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Policies
CREATE TABLE public.reservation_policies (
  business_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  turn_time_minutes integer NOT NULL DEFAULT 90,
  min_lead_minutes integer NOT NULL DEFAULT 60,
  max_party_size integer NOT NULL DEFAULT 12,
  cancellation_window_hours integer NOT NULL DEFAULT 2,
  max_covers_per_interval integer,
  allow_table_join boolean NOT NULL DEFAULT true,
  arrival_grace_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_policies TO authenticated;
GRANT SELECT ON public.reservation_policies TO anon;
GRANT ALL ON public.reservation_policies TO service_role;
ALTER TABLE public.reservation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view policies" ON public.reservation_policies FOR SELECT USING (true);
CREATE POLICY "Business manages own policies" ON public.reservation_policies FOR ALL
  USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE TRIGGER trg_reservation_policies_updated BEFORE UPDATE ON public.reservation_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Weekly schedules (shifts)
CREATE TABLE public.reservation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  shift_name text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservation_schedules_business ON public.reservation_schedules(business_id, weekday);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_schedules TO authenticated;
GRANT SELECT ON public.reservation_schedules TO anon;
GRANT ALL ON public.reservation_schedules TO service_role;
ALTER TABLE public.reservation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view schedules" ON public.reservation_schedules FOR SELECT USING (true);
CREATE POLICY "Business manages own schedules" ON public.reservation_schedules FOR ALL
  USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);

-- 4. Blackout dates
CREATE TABLE public.reservation_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blackout_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, blackout_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_blackouts TO authenticated;
GRANT SELECT ON public.reservation_blackouts TO anon;
GRANT ALL ON public.reservation_blackouts TO service_role;
ALTER TABLE public.reservation_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blackouts" ON public.reservation_blackouts FOR SELECT USING (true);
CREATE POLICY "Business manages own blackouts" ON public.reservation_blackouts FOR ALL
  USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);

-- 5. Waitlist
CREATE TABLE public.reservation_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  desired_date date NOT NULL,
  desired_time time NOT NULL,
  party_size integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'waiting',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservation_waitlist_lookup ON public.reservation_waitlist(business_id, desired_date, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_waitlist TO authenticated;
GRANT ALL ON public.reservation_waitlist TO service_role;
ALTER TABLE public.reservation_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own waitlist entries" ON public.reservation_waitlist FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Business views waitlist" ON public.reservation_waitlist FOR SELECT
  USING (auth.uid() = business_id);
CREATE POLICY "Business updates waitlist" ON public.reservation_waitlist FOR UPDATE
  USING (auth.uid() = business_id);

-- 6. Reservations: table assignment + lifecycle
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS seated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.reservations SET status = 'confirmed'
  WHERE status NOT IN ('confirmed','seated','completed','cancelled','no_show');

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed','seated','completed','cancelled','no_show'));

CREATE INDEX IF NOT EXISTS idx_reservations_business_date
  ON public.reservations(business_id, reservation_date, status);

-- 7. Multi-table (joined) assignments
CREATE TABLE public.reservation_tables (
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  PRIMARY KEY (reservation_id, table_id)
);
CREATE INDEX idx_reservation_tables_table ON public.reservation_tables(table_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_tables TO authenticated;
GRANT ALL ON public.reservation_tables TO service_role;
ALTER TABLE public.reservation_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view reservation tables" ON public.reservation_tables FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id
    AND (r.user_id = auth.uid() OR r.business_id = auth.uid())));
CREATE POLICY "Business manages reservation tables" ON public.reservation_tables FOR ALL
  USING (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND r.business_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND r.business_id = auth.uid()));

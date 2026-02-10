
CREATE TABLE public.reservation_guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reservation_id, user_id)
);

ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reservation owner can view guests"
  ON public.reservation_guests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Business can view reservation guests"
  ON public.reservation_guests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.business_id = auth.uid())
  );

CREATE POLICY "Tagged users can view own guest entry"
  ON public.reservation_guests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Reservation owner can add guests"
  ON public.reservation_guests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Reservation owner can remove guests"
  ON public.reservation_guests FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id AND r.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.handle_reservation_guest_tagged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  reserver_username TEXT;
  formatted_date TEXT;
  res RECORD;
BEGIN
  SELECT r.*, p_biz.full_name AS biz_name, p_biz.username AS biz_username
  INTO res
  FROM reservations r
  JOIN profiles p_biz ON p_biz.id = r.business_id
  WHERE r.id = NEW.reservation_id;

  SELECT username INTO reserver_username FROM profiles WHERE id = res.user_id;
  formatted_date := to_char(res.reservation_date, 'DD/MM');

  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.user_id,
    'reservation_tagged',
    'Reserva',
    '@' || reserver_username || ' te incluyó en una reserva en ' || COALESCE(res.biz_name, res.biz_username) || ' el ' || formatted_date,
    'reservation',
    NEW.reservation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reservation_guest_tagged
  AFTER INSERT ON public.reservation_guests
  FOR EACH ROW EXECUTE FUNCTION public.handle_reservation_guest_tagged();

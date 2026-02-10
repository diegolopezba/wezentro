
-- New reservations table
CREATE TABLE public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  cancelled_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add capacity column to profiles
ALTER TABLE public.profiles ADD COLUMN reservation_capacity INTEGER;

-- RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Users see their own reservations
CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners see reservations at their place
CREATE POLICY "Business owners can view their reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = business_id);

-- Authenticated users can create reservations
CREATE POLICY "Users can create reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update (cancel) their own reservations
CREATE POLICY "Users can update own reservations"
  ON public.reservations FOR UPDATE
  USING (auth.uid() = user_id);

-- Business can update reservations at their place
CREATE POLICY "Business can update their reservations"
  ON public.reservations FOR UPDATE
  USING (auth.uid() = business_id);

-- Updated_at trigger
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Notification trigger for new reservations
CREATE OR REPLACE FUNCTION public.handle_new_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  customer_username TEXT;
  business_name TEXT;
  formatted_date TEXT;
BEGIN
  SELECT username INTO customer_username FROM profiles WHERE id = NEW.user_id;
  SELECT COALESCE(full_name, username) INTO business_name FROM profiles WHERE id = NEW.business_id;
  
  formatted_date := to_char(NEW.reservation_date, 'DD/MM');
  
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'new_reservation',
    'Nueva Reserva',
    '@' || customer_username || ' reservó una mesa para ' || NEW.party_size || ' personas el ' || formatted_date,
    'reservation',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_reservation();

-- Trigger for cancellations
CREATE OR REPLACE FUNCTION public.handle_reservation_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  customer_username TEXT;
  business_name TEXT;
  formatted_date TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  SELECT username INTO customer_username FROM profiles WHERE id = NEW.user_id;
  SELECT COALESCE(full_name, username) INTO business_name FROM profiles WHERE id = NEW.business_id;
  formatted_date := to_char(NEW.reservation_date, 'DD/MM');
  
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by = 'business' THEN
      -- Notify customer
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.user_id,
        'reservation_cancelled',
        'Reserva Cancelada',
        'Tu reserva en ' || business_name || ' del ' || formatted_date || ' fue cancelada',
        'reservation',
        NEW.id
      );
    ELSIF NEW.cancelled_by = 'user' THEN
      -- Notify business
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.business_id,
        'reservation_cancelled',
        'Reserva Cancelada',
        '@' || customer_username || ' canceló su reserva del ' || formatted_date,
        'reservation',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reservation_status_change
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_reservation_status_change();

-- Reminders queue table
CREATE TABLE public.reservation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24h', '2h')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_reminders_pending
  ON public.reservation_reminders (scheduled_for)
  WHERE sent_at IS NULL;

CREATE INDEX idx_reservation_reminders_reservation
  ON public.reservation_reminders (reservation_id);

ALTER TABLE public.reservation_reminders ENABLE ROW LEVEL SECURITY;

-- No client-side access; only service role (edge functions) interacts with this table.
-- We intentionally create no RLS policies => denies all anon/authenticated access.

-- Helper to enqueue reminders for a reservation
CREATE OR REPLACE FUNCTION public.enqueue_reservation_reminders(_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_when timestamptz;
  res_status text;
BEGIN
  SELECT (reservation_date::timestamp + reservation_time)::timestamptz, status
    INTO res_when, res_status
  FROM reservations
  WHERE id = _reservation_id;

  IF res_when IS NULL OR res_status <> 'confirmed' THEN
    RETURN;
  END IF;

  -- 24h reminder (only if still in the future)
  IF res_when - interval '24 hours' > now() THEN
    INSERT INTO reservation_reminders (reservation_id, scheduled_for, reminder_type)
    VALUES (_reservation_id, res_when - interval '24 hours', '24h');
  END IF;

  -- 2h reminder
  IF res_when - interval '2 hours' > now() THEN
    INSERT INTO reservation_reminders (reservation_id, scheduled_for, reminder_type)
    VALUES (_reservation_id, res_when - interval '2 hours', '2h');
  END IF;
END;
$$;

-- Trigger: on new confirmed reservation, enqueue reminders
CREATE OR REPLACE FUNCTION public.trg_reservation_after_insert_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM enqueue_reservation_reminders(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservation_after_insert_reminders
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trg_reservation_after_insert_reminders();

-- Trigger: on reservation update, refresh reminders if date/time/status changed
CREATE OR REPLACE FUNCTION public.trg_reservation_after_update_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.reservation_date IS DISTINCT FROM OLD.reservation_date)
     OR (NEW.reservation_time IS DISTINCT FROM OLD.reservation_time)
     OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    -- Drop pending reminders
    DELETE FROM reservation_reminders
    WHERE reservation_id = NEW.id AND sent_at IS NULL;

    -- Re-enqueue only if still confirmed
    IF NEW.status = 'confirmed' THEN
      PERFORM enqueue_reservation_reminders(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservation_after_update_reminders
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trg_reservation_after_update_reminders();
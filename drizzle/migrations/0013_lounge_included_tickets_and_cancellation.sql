-- Entradas incluidas en áreas de lounge (catálogo, override por evento, snapshot en reserva)
ALTER TABLE public.venue_layout_areas
  ADD COLUMN included_tickets integer;

ALTER TABLE public.event_areas
  ADD COLUMN included_tickets integer;

ALTER TABLE public.area_bookings
  ADD COLUMN included_tickets integer NOT NULL DEFAULT 0,
  ADD COLUMN cancelled_by text CHECK (cancelled_by IN ('user','business')),
  ADD COLUMN cancellation_reason text;

-- Estados extendidos para operación del negocio (check-in / no-show)
ALTER TABLE public.area_bookings
  DROP CONSTRAINT area_bookings_status_check;
ALTER TABLE public.area_bookings
  ADD CONSTRAINT area_bookings_status_check
  CHECK (status IN ('held','confirmed','cancelled','checked_in','no_show'));

-- Rastrear las entradas generadas por una reserva de área
ALTER TABLE public.guestlist_entries
  ADD COLUMN area_booking_id uuid REFERENCES public.area_bookings(id) ON DELETE SET NULL;
CREATE INDEX idx_guestlist_entries_area_booking
  ON public.guestlist_entries(area_booking_id)
  WHERE area_booking_id IS NOT NULL;

-- Notificación de cancelación: solo se avisa al negocio cuando el invitado cancela.
-- (Cancelación del negocio: sin notificación in-app, por diseño del lounge manager.)
CREATE OR REPLACE FUNCTION public.handle_area_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_business_id uuid;
  v_event_title text;
  v_area_name text;
  v_customer_username text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND NEW.cancelled_by = 'user' THEN
    SELECT ea.event_id, ea.name INTO v_event_id, v_area_name
    FROM public.event_areas ea
    WHERE ea.id = NEW.event_area_id;

    SELECT e.creator_id, e.title INTO v_business_id, v_event_title
    FROM public.events e
    WHERE e.id = v_event_id;

    SELECT username INTO v_customer_username
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF v_business_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        v_business_id,
        'reservation_cancelled',
        'Reserva de lounge cancelada',
        '@' || COALESCE(v_customer_username, 'usuario') || ' canceló ' ||
          COALESCE(v_area_name, 'su área') ||
          CASE WHEN v_event_title IS NOT NULL THEN ' en ' || v_event_title ELSE '' END ||
          CASE WHEN NEW.cancellation_reason IS NOT NULL THEN ' — ' || NEW.cancellation_reason ELSE '' END,
        'event',
        v_event_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER area_booking_status_change
  AFTER UPDATE OF status ON public.area_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_area_booking_status_change();

-- Realtime para la vista de gestión (owner-only en el cliente)
ALTER PUBLICATION supabase_realtime ADD TABLE public.area_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_areas;
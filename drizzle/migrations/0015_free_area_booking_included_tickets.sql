-- Áreas gratis con entradas incluidas: generar las entradas al confirmar
CREATE OR REPLACE FUNCTION public.confirm_free_area_booking(_booking_id uuid)
 RETURNS area_bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _booking public.area_bookings;
  _area public.event_areas;
  _uid UUID := auth.uid();
  _entry_id UUID;
  _included integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _booking FROM public.area_bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.user_id <> _uid THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _booking.status = 'confirmed' THEN
    RETURN _booking;
  END IF;

  IF _booking.status <> 'held'
     OR (_booking.hold_expires_at IS NOT NULL AND _booking.hold_expires_at <= now()) THEN
    RAISE EXCEPTION 'hold_expired' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _area FROM public.event_areas WHERE id = _booking.event_area_id;
  IF NOT FOUND OR COALESCE(_area.price, 0) > 0 THEN
    RAISE EXCEPTION 'area_requires_payment' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.guestlist_entries (event_id, user_id, status, payment_status)
  VALUES (_area.event_id, _uid, 'approved', 'none')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'approved'
  RETURNING id INTO _entry_id;

  _included := GREATEST(COALESCE(_area.included_tickets, 0), 0);

  UPDATE public.area_bookings
     SET status = 'confirmed',
         hold_expires_at = NULL,
         guestlist_entry_id = _entry_id,
         included_tickets = _included
   WHERE id = _booking_id
  RETURNING * INTO _booking;

  -- Etiquetar la entrada del comprador y generar las entradas incluidas extra
  -- (quedan sin asignar: el comprador las recibe y las reparte).
  IF _included > 0 THEN
    UPDATE public.guestlist_entries
       SET area_booking_id = _booking.id
     WHERE id = _entry_id;

    INSERT INTO public.guestlist_entries (event_id, user_id, status, payment_status, purchased_by_user_id, area_booking_id)
    SELECT _area.event_id, NULL, 'approved', 'none', _uid, _booking.id
    FROM generate_series(2, _included);
  END IF;

  RETURN _booking;
END;
$function$;
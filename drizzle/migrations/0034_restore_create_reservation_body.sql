CREATE OR REPLACE FUNCTION public.create_reservation(_business_id uuid, _date date, _time time without time zone, _party_size integer, _notes text DEFAULT NULL::text, _guest_ids uuid[] DEFAULT NULL::uuid[], _reservation_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prof record; pol record; turn int; dow int; uid uuid := auth.uid();
  ok boolean; capacity int; booked int; covers int;
  chosen uuid[] := '{}'; acc int := 0; t record; res_id uuid; has_tables boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT reservations_enabled, reservation_capacity
    INTO prof FROM profiles WHERE id = _business_id;
  IF prof IS NULL OR prof.reservations_enabled IS FALSE THEN
    RAISE EXCEPTION 'Este negocio no acepta reservas';
  END IF;

  IF NOT public.has_active_business_plan(_business_id) THEN
    RAISE EXCEPTION 'Este negocio no acepta reservas';
  END IF;

  SELECT * INTO pol FROM reservation_policies WHERE business_id = _business_id;
  turn := COALESCE(pol.turn_time_minutes, 90);
  dow := EXTRACT(dow FROM _date)::int;

  IF _party_size < 1 OR _party_size > COALESCE(pol.max_party_size, 12) THEN
    RAISE EXCEPTION 'Tamaño de grupo no permitido';
  END IF;

  IF EXISTS (SELECT 1 FROM reservation_blackouts b WHERE b.business_id = _business_id AND b.blackout_date = _date) THEN
    RAISE EXCEPTION 'El negocio no acepta reservas ese día';
  END IF;

  IF (_date + _time) < ((now() AT TIME ZONE 'America/La_Paz') + make_interval(mins => COALESCE(pol.min_lead_minutes, 60))) THEN
    RAISE EXCEPTION 'Debes reservar con más anticipación';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.get_business_shifts(_business_id, dow) sh
    WHERE _time >= sh.start_time AND _time < sh.end_time
  ) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Horario fuera del rango de reservas'; END IF;

  -- Serialize bookings for this business
  PERFORM 1 FROM restaurant_tables WHERE business_id = _business_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(hashtext(_business_id::text));

  SELECT COUNT(*) > 0 INTO has_tables FROM restaurant_tables
    WHERE business_id = _business_id AND is_active;

  IF has_tables THEN
    FOR t IN
      SELECT rt.id, rt.seats FROM restaurant_tables rt
      WHERE rt.business_id = _business_id AND rt.is_active
        AND NOT EXISTS (
          SELECT 1 FROM reservation_tables x
          JOIN reservations r ON r.id = x.reservation_id
          WHERE x.table_id = rt.id
            AND (_reservation_id IS NULL OR r.id <> _reservation_id)
            AND r.reservation_date = _date
            AND r.status IN ('confirmed','seated')
            AND r.reservation_time < _time + make_interval(mins => turn)
            AND _time < r.reservation_time + make_interval(mins => r.duration_minutes)
        )
      ORDER BY (rt.seats >= _party_size) DESC, rt.seats ASC
    LOOP
      IF array_length(chosen, 1) IS NULL AND t.seats >= _party_size THEN
        chosen := ARRAY[t.id]; acc := t.seats;
        EXIT;
      END IF;
      IF COALESCE(pol.allow_table_join, true) THEN
        chosen := chosen || t.id; acc := acc + t.seats;
        EXIT WHEN acc >= _party_size OR array_length(chosen, 1) >= 3;
      END IF;
    END LOOP;

    IF acc < _party_size THEN
      RAISE EXCEPTION 'No hay mesas disponibles para ese horario';
    END IF;
  ELSE
    capacity := prof.reservation_capacity;
    IF capacity IS NOT NULL THEN
      SELECT COALESCE(SUM(r.party_size), 0) INTO booked FROM reservations r
      WHERE r.business_id = _business_id AND r.reservation_date = _date
        AND r.status IN ('confirmed','seated')
        AND (_reservation_id IS NULL OR r.id <> _reservation_id)
        AND r.reservation_time < _time + make_interval(mins => turn)
        AND _time < r.reservation_time + make_interval(mins => r.duration_minutes);
      IF booked + _party_size > capacity THEN
        RAISE EXCEPTION 'No hay disponibilidad para ese horario';
      END IF;
    END IF;
  END IF;

  IF pol.max_covers_per_interval IS NOT NULL THEN
    SELECT COALESCE(SUM(r.party_size), 0) INTO covers FROM reservations r
    WHERE r.business_id = _business_id AND r.reservation_date = _date
      AND r.status IN ('confirmed','seated')
      AND (_reservation_id IS NULL OR r.id <> _reservation_id)
      AND r.reservation_time >= _time AND r.reservation_time < _time + interval '15 minutes';
    IF covers + _party_size > pol.max_covers_per_interval THEN
      RAISE EXCEPTION 'No hay disponibilidad para ese horario';
    END IF;
  END IF;

  IF _reservation_id IS NULL THEN
    INSERT INTO reservations (business_id, user_id, reservation_date, reservation_time,
                              party_size, notes, status, duration_minutes, table_id)
    VALUES (_business_id, uid, _date, _time, _party_size, _notes, 'confirmed', turn, chosen[1])
    RETURNING id INTO res_id;
  ELSE
    UPDATE reservations SET reservation_date = _date, reservation_time = _time,
      party_size = _party_size, notes = _notes, duration_minutes = turn, table_id = chosen[1]
    WHERE id = _reservation_id AND user_id = uid AND status = 'confirmed'
    RETURNING id INTO res_id;
    IF res_id IS NULL THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
    DELETE FROM reservation_tables WHERE reservation_id = res_id;
  END IF;

  IF array_length(chosen, 1) IS NOT NULL THEN
    INSERT INTO reservation_tables (reservation_id, table_id)
    SELECT res_id, unnest(chosen) ON CONFLICT DO NOTHING;
  END IF;

  IF _guest_ids IS NOT NULL AND _reservation_id IS NULL THEN
    INSERT INTO reservation_guests (reservation_id, user_id)
    SELECT res_id, g FROM unnest(_guest_ids) g ON CONFLICT DO NOTHING;
  END IF;

  RETURN res_id;
END;
$function$;
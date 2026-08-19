
CREATE OR REPLACE FUNCTION public.get_reservation_availability(
  _business_id uuid, _date date, _party_size integer DEFAULT 2
)
RETURNS TABLE(slot_time time, status text, seats_left integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  prof record; pol record; s record;
  slot time; turn int; total_seats int := 0; has_tables boolean := false;
  free_arr int[]; free_seats int; fits boolean; acc int; cnt int; v int;
  booked int; capacity int; covers int; min_slot time := NULL; dow int;
  st text;
BEGIN
  SELECT reservations_enabled, reservation_start_time, reservation_end_time, reservation_capacity
    INTO prof FROM profiles WHERE id = _business_id;
  IF prof IS NULL OR prof.reservations_enabled IS FALSE THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM reservation_blackouts b WHERE b.business_id = _business_id AND b.blackout_date = _date) THEN RETURN; END IF;

  SELECT * INTO pol FROM reservation_policies WHERE business_id = _business_id;
  turn := COALESCE(pol.turn_time_minutes, 90);
  IF _party_size > COALESCE(pol.max_party_size, 12) THEN RETURN; END IF;

  SELECT COUNT(*) > 0, COALESCE(SUM(seats), 0) INTO has_tables, total_seats
    FROM restaurant_tables WHERE business_id = _business_id AND is_active;

  capacity := prof.reservation_capacity;
  dow := EXTRACT(dow FROM _date)::int;

  IF _date = (now() AT TIME ZONE 'America/La_Paz')::date THEN
    min_slot := ((now() AT TIME ZONE 'America/La_Paz') + make_interval(mins => COALESCE(pol.min_lead_minutes, 60)))::time;
  ELSIF _date < (now() AT TIME ZONE 'America/La_Paz')::date THEN
    RETURN;
  END IF;

  FOR s IN
    SELECT sc.start_time, sc.end_time FROM reservation_schedules sc
      WHERE sc.business_id = _business_id AND sc.weekday = dow AND NOT sc.is_closed
    UNION ALL
    SELECT COALESCE(prof.reservation_start_time, '12:00'::time), COALESCE(prof.reservation_end_time, '22:00'::time)
      WHERE NOT EXISTS (SELECT 1 FROM reservation_schedules sc2 WHERE sc2.business_id = _business_id AND sc2.weekday = dow)
  LOOP
    slot := s.start_time;
    WHILE slot < s.end_time LOOP
      IF min_slot IS NULL OR slot > min_slot THEN
        fits := false; free_seats := 0;

        IF has_tables THEN
          SELECT COALESCE(array_agg(rt.seats ORDER BY rt.seats DESC), '{}') INTO free_arr
          FROM restaurant_tables rt
          WHERE rt.business_id = _business_id AND rt.is_active
            AND NOT EXISTS (
              SELECT 1 FROM reservation_tables x
              JOIN reservations r ON r.id = x.reservation_id
              WHERE x.table_id = rt.id
                AND r.reservation_date = _date
                AND r.status IN ('confirmed','seated')
                AND r.reservation_time < slot + make_interval(mins => turn)
                AND slot < r.reservation_time + make_interval(mins => r.duration_minutes)
            );

          SELECT COALESCE(SUM(x), 0) INTO free_seats FROM unnest(free_arr) x;
          fits := EXISTS (SELECT 1 FROM unnest(free_arr) x WHERE x >= _party_size);
          IF NOT fits AND COALESCE(pol.allow_table_join, true) THEN
            acc := 0; cnt := 0;
            FOREACH v IN ARRAY free_arr LOOP
              acc := acc + v; cnt := cnt + 1;
              EXIT WHEN acc >= _party_size OR cnt >= 3;
            END LOOP;
            fits := acc >= _party_size;
          END IF;
        ELSE
          SELECT COALESCE(SUM(r.party_size), 0) INTO booked
          FROM reservations r
          WHERE r.business_id = _business_id AND r.reservation_date = _date
            AND r.status IN ('confirmed','seated')
            AND r.reservation_time < slot + make_interval(mins => turn)
            AND slot < r.reservation_time + make_interval(mins => r.duration_minutes);
          IF capacity IS NULL THEN
            fits := true; free_seats := 0;
          ELSE
            free_seats := GREATEST(0, capacity - booked);
            fits := booked + _party_size <= capacity;
          END IF;
        END IF;

        IF fits AND pol.max_covers_per_interval IS NOT NULL THEN
          SELECT COALESCE(SUM(r.party_size), 0) INTO covers
          FROM reservations r
          WHERE r.business_id = _business_id AND r.reservation_date = _date
            AND r.status IN ('confirmed','seated')
            AND r.reservation_time >= slot AND r.reservation_time < slot + interval '15 minutes';
          IF covers + _party_size > pol.max_covers_per_interval THEN fits := false; END IF;
        END IF;

        IF NOT fits THEN
          st := 'full';
        ELSIF (has_tables AND total_seats > 0 AND free_seats <= GREATEST(1, (total_seats * 0.25)::int))
           OR (NOT has_tables AND capacity IS NOT NULL AND free_seats <= GREATEST(1, (capacity * 0.25)::int)) THEN
          st := 'limited';
        ELSE
          st := 'available';
        END IF;

        slot_time := slot; status := st; seats_left := free_seats;
        RETURN NEXT;
      END IF;
      slot := slot + interval '30 minutes';
    END LOOP;
  END LOOP;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.create_reservation(
  _business_id uuid,
  _date date,
  _time time,
  _party_size integer,
  _notes text DEFAULT NULL,
  _guest_ids uuid[] DEFAULT NULL,
  _reservation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  prof record; pol record; turn int; dow int; uid uuid := auth.uid();
  ok boolean; capacity int; booked int; covers int;
  chosen uuid[] := '{}'; acc int := 0; t record; res_id uuid; has_tables boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT reservations_enabled, reservation_start_time, reservation_end_time, reservation_capacity
    INTO prof FROM profiles WHERE id = _business_id;
  IF prof IS NULL OR prof.reservations_enabled IS FALSE THEN
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

  IF EXISTS (SELECT 1 FROM reservation_schedules sc WHERE sc.business_id = _business_id AND sc.weekday = dow) THEN
    SELECT EXISTS (
      SELECT 1 FROM reservation_schedules sc
      WHERE sc.business_id = _business_id AND sc.weekday = dow AND NOT sc.is_closed
        AND _time >= sc.start_time AND _time < sc.end_time
    ) INTO ok;
  ELSE
    ok := _time >= COALESCE(prof.reservation_start_time, '12:00'::time)
      AND _time < COALESCE(prof.reservation_end_time, '22:00'::time);
  END IF;
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
$fn$;

CREATE OR REPLACE FUNCTION public.set_reservation_status(_reservation_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE r record; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _status NOT IN ('confirmed','seated','completed','cancelled','no_show') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;
  SELECT * INTO r FROM reservations WHERE id = _reservation_id;
  IF r IS NULL THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF uid <> r.business_id AND NOT (uid = r.user_id AND _status = 'cancelled') THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;

  UPDATE reservations SET
    status = _status,
    cancelled_by = CASE WHEN _status = 'cancelled'
      THEN CASE WHEN uid = r.business_id THEN 'business' ELSE 'user' END ELSE cancelled_by END,
    seated_at = CASE WHEN _status = 'seated' THEN now() ELSE seated_at END,
    completed_at = CASE WHEN _status IN ('completed','no_show') THEN now() ELSE completed_at END
  WHERE id = _reservation_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_reservation_availability(uuid, date, integer) FROM anon;
REVOKE ALL ON FUNCTION public.create_reservation(uuid, date, time, integer, text, uuid[], uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_reservation_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reservation_availability(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reservation(uuid, date, time, integer, text, uuid[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_reservation_status(uuid, text) TO authenticated;

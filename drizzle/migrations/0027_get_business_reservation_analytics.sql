CREATE OR REPLACE FUNCTION public.get_business_reservation_analytics(
  _business_id uuid,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to date := COALESCE(_to, (now() AT TIME ZONE 'America/La_Paz')::date + 365);
  v_from date := _from;
  v_len int;
  v_prev_from date;
  v_prev_to date;
  v_result jsonb;
  v_cur jsonb;
  v_prev jsonb;
  v_heatmap jsonb;
  v_cancel jsonb;
  v_waitlist jsonb;
  v_guests jsonb;
  v_service jsonb;
  v_capacity jsonb;
  v_repeat jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _business_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_from IS NOT NULL THEN
    v_len := GREATEST(1, (v_to - v_from));
    v_prev_to := v_from - 1;
    v_prev_from := v_prev_to - v_len;
  END IF;

  WITH base AS (
    SELECT r.*
    FROM reservations r
    WHERE r.business_id = _business_id
      AND (v_from IS NULL OR r.reservation_date BETWEEN v_from AND v_to)
  ), agg AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
      COALESCE(SUM(party_size) FILTER (WHERE status NOT IN ('cancelled','no_show')), 0)::int AS covers,
      COALESCE(AVG(party_size) FILTER (WHERE status NOT IN ('cancelled','no_show')), 0)::numeric AS avg_party,
      COALESCE(AVG(EXTRACT(EPOCH FROM ((reservation_date + reservation_time) - (created_at AT TIME ZONE 'America/La_Paz'))) / 3600.0), 0)::numeric AS lead_hours
    FROM base
  )
  SELECT jsonb_build_object(
    'total', total,
    'cancelled', cancelled,
    'no_shows', no_shows,
    'covers', covers,
    'avg_party', ROUND(avg_party, 1),
    'cancel_rate', CASE WHEN total > 0 THEN ROUND(cancelled * 100.0 / total, 0) ELSE NULL END,
    'no_show_rate', CASE WHEN total > 0 THEN ROUND(no_shows * 100.0 / total, 0) ELSE NULL END,
    'lead_hours', ROUND(lead_hours, 1)
  ) INTO v_cur FROM agg;

  IF v_from IS NOT NULL THEN
    WITH base AS (
      SELECT r.*
      FROM reservations r
      WHERE r.business_id = _business_id
        AND r.reservation_date BETWEEN v_prev_from AND v_prev_to
    )
    SELECT jsonb_build_object(
      'total', COUNT(*)::int,
      'covers', COALESCE(SUM(party_size) FILTER (WHERE status NOT IN ('cancelled','no_show')), 0)::int
    ) INTO v_prev FROM base;
  ELSE
    v_prev := NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'dow', dow, 'hour', hour, 'count', cnt, 'covers', covers
  )), '[]'::jsonb)
  INTO v_heatmap
  FROM (
    SELECT EXTRACT(DOW FROM reservation_date)::int AS dow,
           EXTRACT(HOUR FROM reservation_time)::int AS hour,
           COUNT(*)::int AS cnt,
           COALESCE(SUM(party_size), 0)::int AS covers
    FROM reservations
    WHERE business_id = _business_id
      AND status NOT IN ('cancelled','no_show')
      AND (v_from IS NULL OR reservation_date BETWEEN v_from AND v_to)
    GROUP BY 1, 2
  ) h;

  SELECT jsonb_build_object(
    'by_actor', COALESCE((
      SELECT jsonb_object_agg(COALESCE(cancelled_by, 'desconocido'), c)
      FROM (
        SELECT cancelled_by, COUNT(*)::int AS c
        FROM reservations
        WHERE business_id = _business_id AND status = 'cancelled'
          AND (v_from IS NULL OR reservation_date BETWEEN v_from AND v_to)
        GROUP BY 1
      ) a
    ), '{}'::jsonb),
    'by_hour', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', hour, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT EXTRACT(HOUR FROM reservation_time)::int AS hour, COUNT(*)::int AS c
        FROM reservations
        WHERE business_id = _business_id AND status IN ('cancelled','no_show')
          AND (v_from IS NULL OR reservation_date BETWEEN v_from AND v_to)
        GROUP BY 1
      ) b
    ), '[]'::jsonb),
    'lost_covers', COALESCE((
      SELECT SUM(party_size)::int
      FROM reservations
      WHERE business_id = _business_id AND status IN ('cancelled','no_show')
        AND (v_from IS NULL OR reservation_date BETWEEN v_from AND v_to)
    ), 0)
  ) INTO v_cancel;

  SELECT jsonb_build_object(
    'total', COUNT(*)::int,
    'people', COALESCE(SUM(party_size), 0)::int,
    'converted', COUNT(*) FILTER (WHERE status IN ('converted','booked','seated'))::int,
    'notified', COUNT(*) FILTER (WHERE notified_at IS NOT NULL)::int,
    'top_slots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT EXTRACT(DOW FROM desired_date)::int AS dow,
               EXTRACT(HOUR FROM desired_time)::int AS hour,
               COUNT(*)::int AS c
        FROM reservation_waitlist
        WHERE business_id = _business_id
          AND (v_from IS NULL OR desired_date BETWEEN v_from AND v_to)
        GROUP BY 1, 2
        ORDER BY c DESC
        LIMIT 3
      ) t
    ), '[]'::jsonb)
  ) INTO v_waitlist
  FROM reservation_waitlist
  WHERE business_id = _business_id
    AND (v_from IS NULL OR desired_date BETWEEN v_from AND v_to);

  WITH per_user AS (
    SELECT r.user_id, COUNT(*)::int AS c, COALESCE(SUM(r.party_size), 0)::int AS covers
    FROM reservations r
    WHERE r.business_id = _business_id
      AND r.user_id IS NOT NULL
      AND r.status NOT IN ('cancelled','no_show')
      AND (v_from IS NULL OR r.reservation_date BETWEEN v_from AND v_to)
    GROUP BY r.user_id
  )
  SELECT jsonb_build_object(
    'unique_guests', COUNT(*)::int,
    'repeat_guests', COUNT(*) FILTER (WHERE c > 1)::int,
    'repeat_rate', CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE c > 1) * 100.0 / COUNT(*), 0) ELSE NULL END,
    'top', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'full_name', pr.full_name,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
        'reservations', p.c,
        'covers', p.covers
      ) ORDER BY p.c DESC, p.covers DESC)
      FROM (SELECT * FROM per_user ORDER BY c DESC, covers DESC LIMIT 5) p
      LEFT JOIN profiles pr ON pr.id = p.user_id
    ), '[]'::jsonb)
  ) INTO v_repeat
  FROM per_user;

  SELECT jsonb_build_object(
    'avg_seat_delay_min', ROUND(COALESCE(AVG(
      EXTRACT(EPOCH FROM ((seated_at AT TIME ZONE 'America/La_Paz') - (reservation_date + reservation_time))) / 60.0
    ), 0)::numeric, 0),
    'avg_table_minutes', ROUND(COALESCE(AVG(
      EXTRACT(EPOCH FROM (completed_at - seated_at)) / 60.0
    ) FILTER (WHERE completed_at IS NOT NULL AND seated_at IS NOT NULL), 0)::numeric, 0),
    'seated_count', COUNT(*) FILTER (WHERE seated_at IS NOT NULL)::int
  ) INTO v_service
  FROM reservations
  WHERE business_id = _business_id
    AND seated_at IS NOT NULL
    AND (v_from IS NULL OR reservation_date BETWEEN v_from AND v_to);

  SELECT jsonb_build_object(
    'active_seats', COALESCE((
      SELECT SUM(seats)::int FROM restaurant_tables
      WHERE business_id = _business_id AND is_active
    ), 0),
    'table_count', COALESCE((
      SELECT COUNT(*)::int FROM restaurant_tables
      WHERE business_id = _business_id AND is_active
    ), 0),
    'turn_time', COALESCE((
      SELECT turn_time_minutes FROM reservation_policies WHERE business_id = _business_id
    ), 90),
    'max_covers_per_interval', (
      SELECT max_covers_per_interval FROM reservation_policies WHERE business_id = _business_id
    ),
    'shifts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'weekday', weekday,
        'shift_name', shift_name,
        'minutes', EXTRACT(EPOCH FROM (end_time - start_time)) / 60
      ) ORDER BY weekday, start_time)
      FROM reservation_schedules
      WHERE business_id = _business_id AND NOT is_closed
    ), '[]'::jsonb)
  ) INTO v_capacity;

  v_result := jsonb_build_object(
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'current', v_cur,
    'previous', v_prev,
    'heatmap', v_heatmap,
    'cancellations', v_cancel,
    'waitlist', v_waitlist,
    'guests', v_repeat,
    'service', v_service,
    'capacity', v_capacity
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_reservation_analytics(uuid, date, date) TO authenticated;
-- Premium businesses (used by the for-you feed for discovery priority)
CREATE OR REPLACE FUNCTION public.get_premium_business_ids()
RETURNS TABLE (business_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.business_id
  FROM public.business_subscriptions s
  WHERE s.tier = 'elite'
    AND s.status IN ('active', 'past_due')
$$;

GRANT EXECUTE ON FUNCTION public.get_premium_business_ids() TO authenticated, anon, service_role;

-- Anonymous city benchmarks for the Premium "Insights de la ciudad" dashboard tab.
CREATE OR REPLACE FUNCTION public.get_city_benchmarks(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _city text;
  _type text;
  _peers uuid[];
  _peer_count int;
  _result jsonb;
BEGIN
  SELECT p.city, p.business_type INTO _city, _type
  FROM public.profiles p
  WHERE p.id = _business_id;

  IF _city IS NULL OR _type IS NULL THEN
    RETURN jsonb_build_object('status', 'insufficient_data', 'reason', 'missing_city_or_type', 'peer_count', 0);
  END IF;

  SELECT array_agg(p.id) INTO _peers
  FROM public.profiles p
  WHERE p.is_business = true
    AND p.city = _city
    AND p.business_type = _type
    AND p.id <> _business_id;

  _peer_count := COALESCE(array_length(_peers, 1), 0);

  IF _peer_count < 5 THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_data',
      'reason', 'not_enough_peers',
      'peer_count', _peer_count,
      'city', _city,
      'business_type', _type
    );
  END IF;

  WITH window_res AS (
    SELECT r.business_id, r.party_size, r.status, r.reservation_time
    FROM public.reservations r
    WHERE r.reservation_date >= (CURRENT_DATE - INTERVAL '30 days')
      AND r.reservation_date <= CURRENT_DATE
      AND (r.business_id = _business_id OR r.business_id = ANY(_peers))
  ),
  per_business AS (
    SELECT
      business_id,
      COUNT(*)::numeric / 4.285 AS res_per_week,
      AVG(party_size)::numeric AS avg_party,
      (COUNT(*) FILTER (WHERE status = 'cancelled'))::numeric
        / NULLIF(COUNT(*), 0)::numeric * 100 AS cancel_rate
    FROM window_res
    GROUP BY business_id
  ),
  peer_stats AS (
    SELECT
      AVG(res_per_week) AS res_per_week,
      AVG(avg_party) AS avg_party,
      AVG(cancel_rate) AS cancel_rate
    FROM per_business
    WHERE business_id <> _business_id
  ),
  mine AS (
    SELECT res_per_week, avg_party, cancel_rate
    FROM per_business
    WHERE business_id = _business_id
  ),
  peer_hour AS (
    SELECT EXTRACT(HOUR FROM reservation_time)::int AS h, COUNT(*) AS c
    FROM window_res
    WHERE business_id <> _business_id
    GROUP BY 1 ORDER BY c DESC LIMIT 1
  ),
  my_hour AS (
    SELECT EXTRACT(HOUR FROM reservation_time)::int AS h, COUNT(*) AS c
    FROM window_res
    WHERE business_id = _business_id
    GROUP BY 1 ORDER BY c DESC LIMIT 1
  ),
  peer_events AS (
    SELECT AVG(e.price)::numeric AS avg_price
    FROM public.events e
    WHERE e.creator_id = ANY(_peers)
      AND e.deleted_at IS NULL
      AND COALESCE(e.is_post, false) = false
      AND e.price IS NOT NULL AND e.price > 0
      AND e.created_at >= now() - INTERVAL '90 days'
  ),
  my_events AS (
    SELECT AVG(e.price)::numeric AS avg_price
    FROM public.events e
    WHERE e.creator_id = _business_id
      AND e.deleted_at IS NULL
      AND COALESCE(e.is_post, false) = false
      AND e.price IS NOT NULL AND e.price > 0
      AND e.created_at >= now() - INTERVAL '90 days'
  )
  SELECT jsonb_build_object(
    'status', 'ok',
    'city', _city,
    'business_type', _type,
    'peer_count', _peer_count,
    'window_days', 30,
    'reservations_per_week', jsonb_build_object(
      'mine', ROUND(COALESCE((SELECT res_per_week FROM mine), 0), 1),
      'city', ROUND(COALESCE((SELECT res_per_week FROM peer_stats), 0), 1)
    ),
    'avg_party_size', jsonb_build_object(
      'mine', ROUND(COALESCE((SELECT avg_party FROM mine), 0), 1),
      'city', ROUND(COALESCE((SELECT avg_party FROM peer_stats), 0), 1)
    ),
    'cancellation_rate', jsonb_build_object(
      'mine', ROUND(COALESCE((SELECT cancel_rate FROM mine), 0), 1),
      'city', ROUND(COALESCE((SELECT cancel_rate FROM peer_stats), 0), 1)
    ),
    'busiest_hour', jsonb_build_object(
      'mine', (SELECT h FROM my_hour),
      'city', (SELECT h FROM peer_hour)
    ),
    'avg_event_price', jsonb_build_object(
      'mine', ROUND(COALESCE((SELECT avg_price FROM my_events), 0), 0),
      'city', ROUND(COALESCE((SELECT avg_price FROM peer_events), 0), 0)
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_benchmarks(uuid) TO authenticated, service_role;
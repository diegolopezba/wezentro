CREATE OR REPLACE FUNCTION public.get_city_benchmarks_v2(_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _city text;
  _type text;
  _peers uuid[];
  _all uuid[];
  _peer_count int;
  _result jsonb;
BEGIN
  SELECT p.city, p.business_type INTO _city, _type
  FROM public.profiles p
  WHERE p.id = _business_id;

  IF _city IS NULL OR _type IS NULL THEN
    RETURN jsonb_build_object('status', 'insufficient_data', 'reason', 'missing_city_or_type', 'peer_count', 0, 'min_peers', 5);
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
      'min_peers', 5,
      'missing_peers', 5 - _peer_count,
      'city', _city,
      'business_type', _type
    );
  END IF;

  _all := _peers || _business_id;

  WITH res AS (
    SELECT r.business_id, r.party_size, r.status, r.reservation_time
    FROM public.reservations r
    WHERE r.reservation_date >= (CURRENT_DATE - INTERVAL '30 days')
      AND r.reservation_date <= CURRENT_DATE
      AND r.business_id = ANY(_all)
  ),
  res_m AS (
    SELECT business_id AS id,
      COUNT(*)::numeric / 4.285 AS res_per_week,
      AVG(party_size)::numeric AS avg_party,
      (COUNT(*) FILTER (WHERE status = 'cancelled'))::numeric / NULLIF(COUNT(*), 0)::numeric * 100 AS cancel_rate
    FROM res GROUP BY 1
  ),
  ev AS (
    SELECT e.id, e.creator_id, e.price, e.max_guestlist_capacity
    FROM public.events e
    WHERE e.creator_id = ANY(_all)
      AND e.deleted_at IS NULL
      AND COALESCE(e.is_post, false) = false
  ),
  ev_price AS (
    SELECT creator_id AS id, AVG(price)::numeric AS avg_price
    FROM ev WHERE price IS NOT NULL AND price > 0 GROUP BY 1
  ),
  ev_count AS (
    SELECT creator_id AS id, COUNT(*)::numeric AS n, SUM(COALESCE(max_guestlist_capacity, 0))::numeric AS cap
    FROM ev GROUP BY 1
  ),
  views AS (
    SELECT ev.creator_id AS id, COUNT(DISTINCT ei.user_id)::numeric AS reach
    FROM public.event_interactions ei JOIN ev ON ev.id = ei.event_id
    WHERE ei.type = 'view' GROUP BY 1
  ),
  likes AS (
    SELECT ev.creator_id AS id, COUNT(*)::numeric AS c
    FROM public.event_likes el JOIN ev ON ev.id = el.event_id GROUP BY 1
  ),
  joins AS (
    SELECT ev.creator_id AS id, COUNT(*)::numeric AS c
    FROM public.guestlist_entries g JOIN ev ON ev.id = g.event_id GROUP BY 1
  ),
  foll AS (
    SELECT following_id AS id, COUNT(*)::numeric AS c
    FROM public.follows WHERE following_id = ANY(_all) GROUP BY 1
  ),
  metrics AS (
    SELECT
      b AS id,
      COALESCE(res_m.res_per_week, 0) AS res_per_week,
      COALESCE(res_m.avg_party, 0) AS avg_party,
      COALESCE(res_m.cancel_rate, 0) AS cancel_rate,
      COALESCE(ev_price.avg_price, 0) AS avg_price,
      COALESCE(views.reach, 0) / NULLIF(COALESCE(ev_count.n, 0), 0) AS reach_per_event,
      COALESCE(COALESCE(likes.c, 0) + COALESCE(joins.c, 0), 0) / NULLIF(COALESCE(views.reach, 0), 0) * 100 AS engagement,
      COALESCE(foll.c, 0) AS followers,
      COALESCE(joins.c, 0) / NULLIF(COALESCE(ev_count.cap, 0), 0) * 100 AS guestlist_fill
    FROM unnest(_all) AS b
    LEFT JOIN res_m ON res_m.id = b
    LEFT JOIN ev_price ON ev_price.id = b
    LEFT JOIN ev_count ON ev_count.id = b
    LEFT JOIN views ON views.id = b
    LEFT JOIN likes ON likes.id = b
    LEFT JOIN joins ON joins.id = b
    LEFT JOIN foll ON foll.id = b
  ),
  m2 AS (
    SELECT id, res_per_week, avg_party, cancel_rate, avg_price,
      COALESCE(reach_per_event, 0) AS reach_per_event,
      COALESCE(engagement, 0) AS engagement,
      followers,
      COALESCE(guestlist_fill, 0) AS guestlist_fill
    FROM metrics
  ),
  pr AS (
    SELECT id,
      ((percent_rank() OVER (ORDER BY res_per_week)
       + percent_rank() OVER (ORDER BY reach_per_event)
       + percent_rank() OVER (ORDER BY engagement)
       + percent_rank() OVER (ORDER BY followers)
       + percent_rank() OVER (ORDER BY guestlist_fill)
       + percent_rank() OVER (ORDER BY cancel_rate DESC)) / 6.0)::numeric AS score
    FROM m2
  ),
  ranked AS (
    SELECT id, score, rank() OVER (ORDER BY score DESC)::int AS rnk, COUNT(*) OVER ()::int AS total
    FROM pr
  ),
  peers_m AS (SELECT * FROM m2 WHERE id <> _business_id),
  agg AS (
    SELECT
      AVG(res_per_week)::numeric AS res_per_week, (percentile_cont(0.75) WITHIN GROUP (ORDER BY res_per_week))::numeric AS res_per_week_top,
      AVG(avg_party)::numeric AS avg_party, (percentile_cont(0.75) WITHIN GROUP (ORDER BY avg_party))::numeric AS avg_party_top,
      AVG(cancel_rate)::numeric AS cancel_rate, (percentile_cont(0.25) WITHIN GROUP (ORDER BY cancel_rate))::numeric AS cancel_rate_top,
      AVG(avg_price)::numeric AS avg_price, (percentile_cont(0.75) WITHIN GROUP (ORDER BY avg_price))::numeric AS avg_price_top,
      AVG(reach_per_event)::numeric AS reach, (percentile_cont(0.75) WITHIN GROUP (ORDER BY reach_per_event))::numeric AS reach_top,
      AVG(engagement)::numeric AS engagement, (percentile_cont(0.75) WITHIN GROUP (ORDER BY engagement))::numeric AS engagement_top,
      AVG(followers)::numeric AS followers, (percentile_cont(0.75) WITHIN GROUP (ORDER BY followers))::numeric AS followers_top,
      AVG(guestlist_fill)::numeric AS guestlist_fill, (percentile_cont(0.75) WITHIN GROUP (ORDER BY guestlist_fill))::numeric AS guestlist_fill_top
    FROM peers_m
  ),
  mine AS (SELECT * FROM m2 WHERE id = _business_id),
  my_hours AS (
    SELECT jsonb_agg(jsonb_build_object('hour', h, 'mine', c) ORDER BY h) AS j
    FROM (
      SELECT EXTRACT(HOUR FROM reservation_time)::int AS h, COUNT(*)::numeric AS c
      FROM res WHERE business_id = _business_id GROUP BY 1
    ) s
  ),
  city_hours AS (
    SELECT jsonb_agg(jsonb_build_object('hour', h, 'city', c) ORDER BY h) AS j
    FROM (
      SELECT EXTRACT(HOUR FROM reservation_time)::int AS h,
             ROUND(COUNT(*)::numeric / GREATEST(_peer_count, 1), 2) AS c
      FROM res WHERE business_id <> _business_id GROUP BY 1
    ) s
  )
  SELECT jsonb_build_object(
    'status', 'ok',
    'city', _city,
    'business_type', _type,
    'peer_count', _peer_count,
    'window_days', 30,
    'rank', (SELECT rnk FROM ranked WHERE id = _business_id),
    'rank_total', (SELECT total FROM ranked WHERE id = _business_id),
    'percentile', (SELECT ROUND(score * 100)::int FROM ranked WHERE id = _business_id),
    'metrics', jsonb_build_object(
      'reservations_per_week', jsonb_build_object('mine', ROUND(COALESCE((SELECT res_per_week FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT res_per_week FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT res_per_week_top FROM agg), 0), 1)),
      'avg_party_size', jsonb_build_object('mine', ROUND(COALESCE((SELECT avg_party FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT avg_party FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT avg_party_top FROM agg), 0), 1)),
      'cancellation_rate', jsonb_build_object('mine', ROUND(COALESCE((SELECT cancel_rate FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT cancel_rate FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT cancel_rate_top FROM agg), 0), 1)),
      'avg_event_price', jsonb_build_object('mine', ROUND(COALESCE((SELECT avg_price FROM mine), 0), 0), 'city', ROUND(COALESCE((SELECT avg_price FROM agg), 0), 0), 'top', ROUND(COALESCE((SELECT avg_price_top FROM agg), 0), 0)),
      'reach_per_event', jsonb_build_object('mine', ROUND(COALESCE((SELECT reach_per_event FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT reach FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT reach_top FROM agg), 0), 1)),
      'engagement', jsonb_build_object('mine', ROUND(COALESCE((SELECT engagement FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT engagement FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT engagement_top FROM agg), 0), 1)),
      'followers', jsonb_build_object('mine', ROUND(COALESCE((SELECT followers FROM mine), 0), 0), 'city', ROUND(COALESCE((SELECT followers FROM agg), 0), 0), 'top', ROUND(COALESCE((SELECT followers_top FROM agg), 0), 0)),
      'guestlist_fill', jsonb_build_object('mine', ROUND(COALESCE((SELECT guestlist_fill FROM mine), 0), 1), 'city', ROUND(COALESCE((SELECT guestlist_fill FROM agg), 0), 1), 'top', ROUND(COALESCE((SELECT guestlist_fill_top FROM agg), 0), 1))
    ),
    'hours_mine', COALESCE((SELECT j FROM my_hours), '[]'::jsonb),
    'hours_city', COALESCE((SELECT j FROM city_hours), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_city_benchmarks_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_benchmarks_v2(uuid) TO service_role;
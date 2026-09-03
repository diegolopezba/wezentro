CREATE OR REPLACE FUNCTION public.get_event_area_availability(_event_id UUID)
RETURNS TABLE (
  event_area_id UUID,
  capacity INTEGER,
  is_exclusive BOOLEAN,
  taken INTEGER,
  remaining INTEGER,
  state TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.capacity,
    a.is_exclusive,
    COALESCE(b.taken, 0)::int,
    GREATEST(a.capacity - COALESCE(b.taken, 0), 0)::int,
    CASE
      WHEN a.is_exclusive AND COALESCE(b.cnt, 0) > 0 THEN 'unavailable'
      WHEN NOT a.is_exclusive AND COALESCE(b.taken, 0) >= a.capacity THEN 'unavailable'
      WHEN NOT a.is_exclusive AND COALESCE(b.taken, 0) > 0 THEN 'partial'
      ELSE 'available'
    END
  FROM public.event_areas a
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt, COALESCE(SUM(ab.party_size), 0) AS taken
    FROM public.area_bookings ab
    WHERE ab.event_area_id = a.id
      AND (ab.status = 'confirmed'
           OR (ab.status = 'held' AND (ab.hold_expires_at IS NULL OR ab.hold_expires_at > now())))
  ) b ON true
  WHERE a.event_id = _event_id AND a.is_active = true AND a.is_decor = false;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_area_availability(UUID) TO anon, authenticated, service_role;

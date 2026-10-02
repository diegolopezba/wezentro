CREATE OR REPLACE FUNCTION public.get_event_entry_breakdown(_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events e WHERE e.id = _event_id AND (e.creator_id = auth.uid()
      OR EXISTS (SELECT 1 FROM event_collaborators c WHERE c.event_id = e.id AND c.user_id = auth.uid() AND c.status = 'accepted'))
  ) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;

  WITH ent AS (
    SELECT g.*, ps.is_gate_sale, ps.gate_offer_name, ps.status AS ps_status,
      CASE
        WHEN ps.is_gate_sale THEN 'gate'
        WHEN g.area_booking_id IS NOT NULL THEN 'lounge'
        WHEN g.is_special_guest THEN 'special'
        WHEN g.ticket_tier_id IS NOT NULL THEN 'tier'
        WHEN g.payment_session_id IS NOT NULL THEN 'single'
        ELSE 'manual'
      END AS kind
    FROM guestlist_entries g LEFT JOIN payment_sessions ps ON ps.id = g.payment_session_id
    WHERE g.event_id = _event_id AND g.status IN ('approved','checked_in')
  ), grp AS (
    SELECT kind,
      CASE kind WHEN 'tier' THEN ticket_tier_id::text WHEN 'gate' THEN coalesce(gate_offer_name,'Puerta') ELSE kind END AS key,
      count(*) AS count,
      count(*) FILTER (WHERE checked_in_at IS NOT NULL OR status = 'checked_in') AS checked_in,
      array_agg(DISTINCT payment_session_id) FILTER (WHERE payment_session_id IS NOT NULL) AS sessions
    FROM ent GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'categories', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'kind', g.kind, 'key', g.key,
        'name', CASE g.kind WHEN 'tier' THEN coalesce(t.name,'Entrada') WHEN 'gate' THEN g.key WHEN 'lounge' THEN 'Incluidas en lounges'
                 WHEN 'special' THEN 'Invitaciones especiales' WHEN 'single' THEN 'Precio único' ELSE 'Cortesías / lista manual' END,
        'price', t.price, 'capacity', t.capacity, 'count', g.count, 'checked_in', g.checked_in,
        'revenue', coalesce((SELECT sum(coalesce(p.base_amount, p.amount)) FROM payment_sessions p WHERE p.id = ANY(g.sessions) AND p.status = 'confirmed'),0)
      ) ORDER BY g.kind, t.price NULLS LAST) FROM grp g LEFT JOIN ticket_tiers t ON g.kind='tier' AND t.id::text = g.key), '[]'::jsonb),
    'invites', (SELECT jsonb_build_object(
        'sent', count(*),
        'accepted', count(*) FILTER (WHERE status = 'redeemed'),
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'revoked', count(*) FILTER (WHERE status = 'revoked'),
        'checked_in', count(*) FILTER (WHERE checked_in_at IS NOT NULL))
      FROM event_special_invites WHERE event_id = _event_id)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_event_entry_breakdown(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_event_entry_breakdown(uuid) TO authenticated, service_role;
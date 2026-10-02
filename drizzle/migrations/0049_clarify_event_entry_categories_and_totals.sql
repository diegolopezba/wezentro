CREATE OR REPLACE FUNCTION public.get_event_entry_breakdown(_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = _event_id AND (e.creator_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.event_collaborators c WHERE c.event_id = e.id AND c.user_id = auth.uid() AND c.status = 'accepted'))
  ) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;

  WITH entries AS (
    SELECT g.*, ps.is_gate_sale, ps.gate_offer_name, ps.status AS payment_status,
      ps.base_amount, ps.amount, ps.quantity,
      CASE WHEN ps.is_gate_sale THEN 'gate'
           WHEN g.area_booking_id IS NOT NULL THEN 'lounge'
           WHEN ps.status = 'confirmed' AND g.ticket_tier_id IS NOT NULL THEN 'tier'
           WHEN ps.status = 'confirmed' THEN 'single'
           WHEN g.is_special_guest THEN 'special'
           ELSE 'manual' END AS kind,
      count(*) OVER (PARTITION BY g.payment_session_id) AS session_entries
    FROM public.guestlist_entries g
    LEFT JOIN public.payment_sessions ps ON ps.id = g.payment_session_id
    WHERE g.event_id = _event_id AND g.status IN ('approved','checked_in')
  ), grouped AS (
    SELECT kind,
      CASE WHEN kind = 'tier' THEN ticket_tier_id::text
           WHEN kind = 'gate' THEN coalesce(gate_offer_name, 'Puerta')
           ELSE kind END AS key,
      count(*)::integer AS count,
      count(*) FILTER (WHERE checked_in_at IS NOT NULL OR status = 'checked_in')::integer AS checked_in,
      coalesce(sum(coalesce(base_amount, amount, 0) / nullif(session_entries, 0))
        FILTER (WHERE payment_status = 'confirmed'), 0) AS revenue,
      max(coalesce(base_amount, amount, 0) / nullif(quantity, 0))
        FILTER (WHERE payment_status = 'confirmed') AS session_unit_price
    FROM entries
    GROUP BY 1, 2
  ), configured AS (
    SELECT 'tier'::text AS kind, t.id::text AS key, t.name, t.price, t.capacity,
      t.display_order AS sort_order
    FROM public.ticket_tiers t WHERE t.event_id = _event_id AND t.is_active
    UNION ALL
    SELECT 'single', 'single', 'Precio único', e.price,
      CASE WHEN NOT EXISTS (SELECT 1 FROM public.ticket_tiers t WHERE t.event_id = e.id AND t.is_active)
        THEN e.max_guestlist_capacity ELSE NULL END, -1
    FROM public.events e WHERE e.id = _event_id AND e.price > 0
      AND NOT EXISTS (SELECT 1 FROM public.ticket_tiers t WHERE t.event_id = e.id AND t.is_active)
  ), category_rows AS (
    SELECT coalesce(c.kind, g.kind) AS kind, coalesce(c.key, g.key) AS key,
      coalesce(c.name, CASE g.kind
        WHEN 'tier' THEN 'Entrada' WHEN 'gate' THEN g.key
        WHEN 'lounge' THEN 'Incluidas en lounges' WHEN 'special' THEN 'Invitaciones especiales'
        WHEN 'single' THEN 'Precio único' ELSE 'Cortesías / lista manual' END) AS name,
      CASE WHEN g.kind = 'gate' THEN g.session_unit_price
           WHEN g.kind = 'single' THEN coalesce(c.price, e.price, g.session_unit_price)
           ELSE c.price END AS price,
      c.capacity, coalesce(g.count, 0) AS count, coalesce(g.checked_in, 0) AS checked_in,
      coalesce(g.revenue, 0) AS revenue,
      CASE coalesce(c.kind, g.kind) WHEN 'single' THEN 0 WHEN 'tier' THEN 1
        WHEN 'gate' THEN 2 WHEN 'lounge' THEN 3 WHEN 'special' THEN 4 ELSE 5 END AS section_order,
      c.sort_order
    FROM configured c FULL JOIN grouped g ON c.kind = g.kind AND c.key = g.key
    CROSS JOIN public.events e
    WHERE e.id = _event_id
  )
  SELECT jsonb_build_object(
    'categories', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'kind', r.kind, 'key', r.key, 'name', r.name, 'price', r.price,
      'capacity', r.capacity, 'count', r.count, 'checked_in', r.checked_in,
      'revenue', r.revenue) ORDER BY r.section_order, r.sort_order NULLS LAST, r.name)
      FROM category_rows r), '[]'::jsonb),
    'invites', (SELECT jsonb_build_object(
      'sent', count(*), 'accepted', count(*) FILTER (WHERE status = 'redeemed'),
      'pending', count(*) FILTER (WHERE status = 'pending'),
      'revoked', count(*) FILTER (WHERE status = 'revoked'),
      'checked_in', count(*) FILTER (WHERE checked_in_at IS NOT NULL))
      FROM public.event_special_invites WHERE event_id = _event_id)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_event_entry_breakdown(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_event_entry_breakdown(uuid) TO authenticated, service_role;
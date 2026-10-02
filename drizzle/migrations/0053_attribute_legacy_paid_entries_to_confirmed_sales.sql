DO $migration$ DECLARE fn text; BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('ps.status AS payment_status' IN fn) = 0 OR position('LEFT JOIN public.payment_sessions ps ON ps.id = g.payment_session_id' IN fn) = 0 THEN RAISE EXCEPTION 'Unexpected entry breakdown function'; END IF;
  fn := replace(fn, 'ps.status AS payment_status', 'coalesce(ps.status, CASE WHEN legacy.id IS NOT NULL AND g.payment_status = ''confirmed'' THEN ''confirmed'' END) AS payment_status');
  fn := replace(fn, 'ps.base_amount, ps.amount, ps.quantity', 'coalesce(ps.base_amount, legacy.base_amount) AS base_amount, coalesce(ps.amount, legacy.amount) AS amount, coalesce(ps.quantity, legacy.quantity) AS quantity');
  fn := replace(fn, 'WHEN ps.status = ''confirmed'' AND g.ticket_tier_id IS NOT NULL', 'WHEN (ps.status = ''confirmed'' OR (legacy.id IS NOT NULL AND g.payment_status = ''confirmed'')) AND g.ticket_tier_id IS NOT NULL');
  fn := replace(fn, 'WHEN ps.status = ''confirmed'' THEN ''single''', 'WHEN ps.status = ''confirmed'' OR (legacy.id IS NOT NULL AND g.payment_status = ''confirmed'') THEN ''single''');
  fn := replace(fn, 'PARTITION BY g.payment_session_id', 'PARTITION BY coalesce(g.payment_session_id, legacy.id, g.id)');
  fn := replace(fn, 'LEFT JOIN public.payment_sessions ps ON ps.id = g.payment_session_id', 'LEFT JOIN public.payment_sessions ps ON ps.id = g.payment_session_id' || chr(10) || '    LEFT JOIN LATERAL (SELECT p.id, p.base_amount, p.amount, p.quantity FROM public.payment_sessions p' || chr(10) || '      WHERE g.payment_session_id IS NULL AND g.payment_status = ''confirmed''' || chr(10) || '        AND p.event_id = g.event_id AND p.buyer_user_id = g.user_id AND p.status = ''confirmed''' || chr(10) || '      ORDER BY p.confirmed_at DESC NULLS LAST, p.created_at DESC LIMIT 1) legacy ON true');
  EXECUTE fn;
END $migration$;
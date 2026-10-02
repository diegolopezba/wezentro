DO $migration$ DECLARE fn text; BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('SELECT g.*, ps.is_gate_sale' IN fn) = 0 OR position('FROM entries en' IN fn) = 0 THEN RAISE EXCEPTION 'Unexpected function body'; END IF;
  fn := replace(fn, 'SELECT g.*, ps.is_gate_sale', 'SELECT g.id, g.event_id, g.user_id, g.ticket_tier_id, g.area_booking_id, g.payment_session_id, g.is_special_guest, g.status, g.checked_in_at, ps.is_gate_sale');
  EXECUTE fn;
END $migration$;
DO $migration$ DECLARE fn text; BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('WHEN g.kind = ''single'' THEN coalesce(c.price, e.price, g.session_unit_price)' IN fn) = 0 THEN RAISE EXCEPTION 'Unexpected price selection'; END IF;
  fn := replace(fn, 'WHEN g.kind = ''single'' THEN coalesce(c.price, e.price, g.session_unit_price)', 'WHEN g.kind = ''single'' THEN coalesce(g.session_unit_price, c.price, e.price)');
  EXECUTE fn;
END $migration$;
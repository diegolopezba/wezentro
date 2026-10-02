DO $migration$ DECLARE fn text; BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('FROM entries' IN fn) = 0 OR position('WHERE payment_status = ' IN fn) = 0 THEN
    RAISE EXCEPTION 'Unexpected get_event_entry_breakdown body';
  END IF;
  fn := replace(fn, 'FROM entries\n    GROUP BY', 'FROM entries en\n    GROUP BY');
  fn := replace(fn, 'WHERE payment_status = ', 'WHERE en.payment_status = ');
  EXECUTE fn;
END $migration$;
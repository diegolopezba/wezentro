DO $migration$ DECLARE fn text; BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('FROM entries' || chr(10) || '    GROUP BY' IN fn) = 0 OR position('WHERE en.payment_status' IN fn) = 0 THEN RAISE EXCEPTION 'Unexpected function body'; END IF;
  fn := replace(fn, 'FROM entries' || chr(10) || '    GROUP BY', 'FROM entries en' || chr(10) || '    GROUP BY');
  EXECUTE fn;
END $migration$;
DO $$
DECLARE fn text; patched text;
BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  patched := replace(fn,
    'WHERE g.payment_session_id IS NULL AND g.payment_status = ''confirmed''',
    'WHERE g.payment_session_id IS NULL AND g.payment_status = ''confirmed'' AND NOT coalesce(g.is_special_guest, false)');
  IF patched = fn THEN RAISE EXCEPTION 'Unexpected get_event_entry_breakdown body'; END IF;
  EXECUTE patched;
END $$;
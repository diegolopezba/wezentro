DO $migration$
DECLARE fn text;
BEGIN
  SELECT pg_get_functiondef('public.get_event_entry_breakdown(uuid)'::regprocedure) INTO fn;
  IF position('g.parent_entry_id' IN fn) > 0 OR position('count(*)::integer AS count' IN fn) = 0 THEN
    RAISE EXCEPTION 'Unexpected entry breakdown definition';
  END IF;
  fn := replace(fn, 'SELECT g.id, g.event_id', 'SELECT g.id, g.parent_entry_id, g.event_id');
  fn := replace(fn, 'count(*)::integer AS count,', 'CASE WHEN kind = ''special'' THEN (SELECT count(*)::integer FROM public.event_special_invites i WHERE i.event_id = _event_id AND i.status = ''redeemed'') ELSE count(*) FILTER (WHERE parent_entry_id IS NULL)::integer END AS count,');
  fn := replace(fn, 'FROM public.ticket_tiers t WHERE t.event_id = _event_id AND t.is_active', 'FROM public.ticket_tiers t WHERE t.event_id = _event_id AND (t.is_active OR EXISTS (SELECT 1 FROM entries en WHERE en.ticket_tier_id = t.id))');
  EXECUTE fn;
END
$migration$;
COMMENT ON FUNCTION public.get_event_entry_breakdown(uuid) IS 'Management counts original passes once, not their daily QR children; redeemed invitations count once each. Check-in QR and revenue allocation remain unchanged.';
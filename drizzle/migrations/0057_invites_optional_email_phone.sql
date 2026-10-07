ALTER TABLE public.event_special_invites ADD COLUMN IF NOT EXISTS guest_phone text;

CREATE OR REPLACE FUNCTION public.bulk_create_special_invites(
  _event_id uuid, _segment text, _guests jsonb, _batch_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _batch uuid := COALESCE(_batch_id, gen_random_uuid());
  _created int := 0;
  _total int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.creator_id = _uid AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'not_event_owner';
  END IF;
  SELECT COUNT(*) INTO _total FROM jsonb_array_elements(_guests);
  IF _total > 500 THEN RAISE EXCEPTION 'batch_too_large'; END IF;

  WITH input AS (
    SELECT NULLIF(btrim(g->>'name'), '') AS guest_name,
           lower(NULLIF(btrim(g->>'email'), '')) AS guest_email,
           NULLIF(regexp_replace(COALESCE(g->>'phone',''), '\D', '', 'g'), '') AS guest_phone
    FROM jsonb_array_elements(_guests) g
  ), valid AS (
    SELECT * FROM input WHERE guest_name IS NOT NULL
  ), ins AS (
    INSERT INTO public.event_special_invites
      (event_id, created_by, label, guest_name, guest_email, guest_phone, segment, batch_id)
    SELECT _event_id, _uid, v.guest_name, v.guest_name, v.guest_email, v.guest_phone,
           NULLIF(btrim(_segment), ''), _batch
    FROM valid v
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _created FROM ins;

  RETURN jsonb_build_object('batch_id', _batch, 'created', _created, 'skipped', _total - _created);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_create_special_invites(uuid, text, jsonb, uuid) TO authenticated;
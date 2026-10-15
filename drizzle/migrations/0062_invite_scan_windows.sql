ALTER TABLE public.event_special_invites ADD COLUMN IF NOT EXISTS scan_from timestamptz, ADD COLUMN IF NOT EXISTS scan_until timestamptz;
ALTER TABLE public.guestlist_entries ADD COLUMN IF NOT EXISTS scan_from timestamptz, ADD COLUMN IF NOT EXISTS scan_until timestamptz;

CREATE OR REPLACE FUNCTION public.redeem_special_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _inv RECORD;
  _event RECORD;
  _count int;
  _entry_id uuid;
  _n int;
  _day smallint;
  i int;
  _label text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _inv FROM public.event_special_invites WHERE token = _token FOR UPDATE;
  IF _inv IS NULL THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF _inv.status = 'revoked' THEN RAISE EXCEPTION 'invitation_revoked'; END IF;
  IF _inv.status = 'redeemed' AND _inv.redeemed_by IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'invitation_already_used';
  END IF;

  SELECT * INTO _event FROM public.events WHERE id = _inv.event_id AND deleted_at IS NULL;
  IF _event IS NULL THEN RAISE EXCEPTION 'event_not_found'; END IF;

  _n := CASE WHEN jsonb_typeof(_event.event_days) = 'array' THEN jsonb_array_length(_event.event_days) ELSE 0 END;
  IF _n >= 2 THEN
    _day := CASE WHEN _inv.valid_day BETWEEN 1 AND _n THEN _inv.valid_day ELSE 1 END;
  ELSE
    _day := NULL;
  END IF;
  _label := _inv.segment;

  SELECT id INTO _entry_id FROM public.guestlist_entries
   WHERE event_id = _inv.event_id AND user_id = _uid AND parent_entry_id IS NULL
   ORDER BY joined_at LIMIT 1;

  IF _entry_id IS NOT NULL THEN
    UPDATE public.guestlist_entries
       SET is_special_guest = true,
           status = 'approved',
           payment_status = 'confirmed',
           special_guest_label = COALESCE(_inv.segment, special_guest_label),
           scan_from = COALESCE(_inv.scan_from, scan_from),
           scan_until = COALESCE(_inv.scan_until, scan_until),
           checked_in_at = COALESCE(checked_in_at, _inv.checked_in_at),
           attended = CASE WHEN COALESCE(checked_in_at, _inv.checked_in_at) IS NOT NULL THEN true ELSE attended END
     WHERE id = _entry_id;
  ELSE
    IF _event.max_guestlist_capacity IS NOT NULL THEN
      SELECT COUNT(*) INTO _count FROM public.guestlist_entries
       WHERE event_id = _inv.event_id AND status = 'approved' AND parent_entry_id IS NULL;
      IF _count >= _event.max_guestlist_capacity THEN RAISE EXCEPTION 'event_full'; END IF;
    END IF;

    IF _inv.ticket_tier_id IS NOT NULL THEN
      IF NOT public.increment_tier_sold(_inv.ticket_tier_id) THEN RAISE EXCEPTION 'tier_sold_out'; END IF;
    END IF;

    INSERT INTO public.guestlist_entries
      (event_id, user_id, status, payment_status, is_special_guest, qr_code_token, ticket_tier_id, special_guest_label, checked_in_at, attended, event_day, scan_from, scan_until)
    VALUES
      (_inv.event_id, _uid, 'approved', 'confirmed', true,
       COALESCE(_inv.qr_code_token, replace(gen_random_uuid()::text, '-', '')),
       _inv.ticket_tier_id, _label, _inv.checked_in_at, _inv.checked_in_at IS NOT NULL, _day, _inv.scan_from, _inv.scan_until)
    RETURNING id INTO _entry_id;

    IF _n >= 2 AND _inv.valid_day IS NULL THEN
      FOR i IN 2.._n LOOP
        INSERT INTO public.guestlist_entries
          (event_id, user_id, purchased_by_user_id, status, payment_status, is_special_guest, qr_code_token,
           ticket_tier_id, special_guest_label, guest_name, event_day, parent_entry_id, scan_from, scan_until)
        VALUES
          (_inv.event_id, NULL, _uid, 'approved', 'confirmed', true, replace(gen_random_uuid()::text, '-', ''),
           _inv.ticket_tier_id, _label, (SELECT full_name FROM public.profiles WHERE id = _uid), i, _entry_id, _inv.scan_from, _inv.scan_until);
      END LOOP;
    END IF;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now(), qr_code_token = NULL
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$function$;
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _inv FROM public.event_special_invites WHERE token = _token FOR UPDATE;
  IF _inv IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF _inv.status = 'revoked' THEN
    RAISE EXCEPTION 'invitation_revoked';
  END IF;

  IF _inv.status = 'redeemed' AND _inv.redeemed_by IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'invitation_already_used';
  END IF;

  SELECT * INTO _event FROM public.events WHERE id = _inv.event_id AND deleted_at IS NULL;
  IF _event IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  SELECT id INTO _entry_id FROM public.guestlist_entries
   WHERE event_id = _inv.event_id AND user_id = _uid;

  IF _entry_id IS NOT NULL THEN
    UPDATE public.guestlist_entries
       SET is_special_guest = true,
           status = 'approved',
           payment_status = 'confirmed',
           qr_code_token = COALESCE(qr_code_token, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
     WHERE id = _entry_id;
  ELSE
    IF _event.max_guestlist_capacity IS NOT NULL THEN
      SELECT COUNT(*) INTO _count FROM public.guestlist_entries
       WHERE event_id = _inv.event_id AND status = 'approved';
      IF _count >= _event.max_guestlist_capacity THEN
        RAISE EXCEPTION 'event_full';
      END IF;
    END IF;

    IF _inv.ticket_tier_id IS NOT NULL THEN
      IF NOT public.increment_tier_sold(_inv.ticket_tier_id) THEN
        RAISE EXCEPTION 'tier_sold_out';
      END IF;
    END IF;

    INSERT INTO public.guestlist_entries
      (event_id, user_id, status, payment_status, is_special_guest, qr_code_token, ticket_tier_id)
    VALUES
      (_inv.event_id, _uid, 'approved', 'confirmed', true,
       replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
       _inv.ticket_tier_id)
    RETURNING id INTO _entry_id;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$function$;
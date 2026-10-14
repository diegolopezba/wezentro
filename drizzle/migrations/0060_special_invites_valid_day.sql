ALTER TABLE public.event_special_invites ADD COLUMN IF NOT EXISTS valid_day smallint;
COMMENT ON COLUMN public.event_special_invites.valid_day IS '1-based day this invite is valid for in multi-day events. NULL = all days (full pass).';

-- Special-guest entries are issued per day by redeem_special_invite, not by tier triggers.
CREATE OR REPLACE FUNCTION public.issue_multi_day_pass_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days jsonb; v_valid smallint; v_n int; i int;
BEGIN
  IF NEW.parent_entry_id IS NOT NULL OR NEW.ticket_tier_id IS NULL OR NEW.event_day IS DISTINCT FROM 1 OR COALESCE(NEW.is_special_guest,false) THEN
    RETURN NEW;
  END IF;
  SELECT valid_day INTO v_valid FROM public.ticket_tiers WHERE id = NEW.ticket_tier_id;
  IF v_valid IS NOT NULL THEN RETURN NEW; END IF;
  SELECT event_days INTO v_days FROM public.events WHERE id = NEW.event_id;
  v_n := COALESCE(jsonb_array_length(v_days), 0);
  FOR i IN 2..v_n LOOP
    INSERT INTO public.guestlist_entries (
      event_id, user_id, purchased_by_user_id, status, payment_status, payment_confirmed_at,
      ticket_tier_id, promoter_id, is_special_guest, special_guest_label, guest_name, guest_email,
      payment_session_id, area_booking_id, event_day, parent_entry_id
    ) VALUES (
      NEW.event_id, NULL, COALESCE(NEW.purchased_by_user_id, NEW.user_id), NEW.status, NEW.payment_status, NEW.payment_confirmed_at,
      NEW.ticket_tier_id, NEW.promoter_id, NEW.is_special_guest, NEW.special_guest_label,
      COALESCE(NEW.guest_name, (SELECT full_name FROM public.profiles WHERE id = NEW.user_id)), NEW.guest_email,
      NEW.payment_session_id, NEW.area_booking_id, i, NEW.id
    );
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.redeem_special_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $function$
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
   ORDER BY created_at LIMIT 1;

  IF _entry_id IS NOT NULL THEN
    UPDATE public.guestlist_entries
       SET is_special_guest = true,
           status = 'approved',
           payment_status = 'confirmed',
           special_guest_label = COALESCE(_inv.segment, special_guest_label),
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
      (event_id, user_id, status, payment_status, is_special_guest, qr_code_token, ticket_tier_id, special_guest_label, checked_in_at, attended, event_day)
    VALUES
      (_inv.event_id, _uid, 'approved', 'confirmed', true,
       COALESCE(_inv.qr_code_token, replace(gen_random_uuid()::text, '-', '')),
       _inv.ticket_tier_id, _label, _inv.checked_in_at, _inv.checked_in_at IS NOT NULL, _day)
    RETURNING id INTO _entry_id;

    -- Full pass on a multi-day event: one extra QR per remaining day
    IF _n >= 2 AND _inv.valid_day IS NULL THEN
      FOR i IN 2.._n LOOP
        INSERT INTO public.guestlist_entries
          (event_id, user_id, purchased_by_user_id, status, payment_status, is_special_guest, qr_code_token,
           ticket_tier_id, special_guest_label, guest_name, event_day, parent_entry_id)
        VALUES
          (_inv.event_id, NULL, _uid, 'approved', 'confirmed', true, replace(gen_random_uuid()::text, '-', ''),
           _inv.ticket_tier_id, _label, (SELECT full_name FROM public.profiles WHERE id = _uid), i, _entry_id);
      END LOOP;
    END IF;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now(), qr_code_token = NULL
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$function$;

DROP FUNCTION IF EXISTS public.get_special_invite_by_token(text);
CREATE FUNCTION public.get_special_invite_by_token(_token text)
 RETURNS TABLE(id uuid, event_id uuid, token text, status text, segment text, guest_name text, redeemed_by uuid, ticket_tier_id uuid, valid_day smallint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT i.id, i.event_id, i.token, i.status, i.segment, i.guest_name, i.redeemed_by, i.ticket_tier_id, i.valid_day
  FROM public.event_special_invites i
  WHERE i.token = _token
$function$;
GRANT EXECUTE ON FUNCTION public.get_special_invite_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bulk_create_special_invites(_event_id uuid, _segment text, _guests jsonb, _batch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _batch uuid := COALESCE(_batch_id, gen_random_uuid());
  _created int := 0;
  _total int;
  _n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT CASE WHEN jsonb_typeof(e.event_days) = 'array' THEN jsonb_array_length(e.event_days) ELSE 0 END
    INTO _n FROM public.events e WHERE e.id = _event_id AND e.creator_id = _uid AND e.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_event_owner'; END IF;
  SELECT COUNT(*) INTO _total FROM jsonb_array_elements(_guests);
  IF _total > 500 THEN RAISE EXCEPTION 'batch_too_large'; END IF;

  WITH input AS (
    SELECT NULLIF(btrim(g->>'name'), '') AS guest_name,
           lower(NULLIF(btrim(g->>'email'), '')) AS guest_email,
           NULLIF(regexp_replace(COALESCE(g->>'phone',''), '\D', '', 'g'), '') AS guest_phone,
           CASE WHEN (g->>'day') ~ '^\d+$' AND (g->>'day')::int BETWEEN 1 AND _n AND _n >= 2
                THEN (g->>'day')::smallint ELSE NULL END AS valid_day
    FROM jsonb_array_elements(_guests) g
  ), valid AS (
    SELECT * FROM input WHERE guest_name IS NOT NULL
  ), ins AS (
    INSERT INTO public.event_special_invites
      (event_id, created_by, label, guest_name, guest_email, guest_phone, segment, batch_id, valid_day)
    SELECT _event_id, _uid, v.guest_name, v.guest_name, v.guest_email, v.guest_phone,
           NULLIF(btrim(_segment), ''), _batch, v.valid_day
    FROM valid v
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _created FROM ins;

  RETURN jsonb_build_object('batch_id', _batch, 'created', _created, 'skipped', _total - _created);
END;
$function$;
ALTER TABLE public.event_special_invites
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS qr_code_token text,
  ADD COLUMN IF NOT EXISTS rsvp_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_name text,
  ADD COLUMN IF NOT EXISTS rsvp_email text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_esi_qr_token ON public.event_special_invites(qr_code_token) WHERE qr_code_token IS NOT NULL;

-- Public token-scoped lookup for the frictionless RSVP page
CREATE OR REPLACE FUNCTION public.get_public_invite(_token text)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  token text,
  status text,
  segment text,
  delivery_mode text,
  guest_name text,
  guest_email text,
  rsvp_name text,
  rsvp_email text,
  rsvp_confirmed_at timestamptz,
  checked_in_at timestamptz,
  qr_code_token text,
  event_title text,
  event_start timestamptz,
  event_location text,
  event_image_url text,
  host_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id, i.event_id, i.token, i.status, i.segment, i.delivery_mode,
    i.guest_name, i.guest_email, i.rsvp_name, i.rsvp_email,
    i.rsvp_confirmed_at, i.checked_in_at,
    CASE WHEN i.rsvp_confirmed_at IS NOT NULL THEN i.qr_code_token ELSE NULL END,
    e.title, e.start_datetime, e.location_name, e.image_url,
    COALESCE(p.full_name, p.username)
  FROM public.event_special_invites i
  JOIN public.events e ON e.id = i.event_id AND e.deleted_at IS NULL
  LEFT JOIN public.profiles p ON p.id = e.creator_id
  WHERE i.token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_public_invite(text) TO anon, authenticated;

-- Public, idempotent RSVP confirmation: mints the ticket QR on first call
CREATE OR REPLACE FUNCTION public.confirm_invite_rsvp(_token text, _name text, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _n text := nullif(btrim(coalesce(_name, '')), '');
  _e text := lower(nullif(btrim(coalesce(_email, '')), ''));
  _qr text;
BEGIN
  IF _n IS NULL OR length(_n) > 80 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF _e IS NULL OR length(_e) > 160 OR _e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT * INTO _inv FROM public.event_special_invites WHERE token = _token FOR UPDATE;
  IF _inv IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;
  IF _inv.status = 'revoked' THEN
    RAISE EXCEPTION 'invitation_revoked';
  END IF;
  IF _inv.status = 'redeemed' AND _inv.rsvp_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'invitation_already_used';
  END IF;
  IF _inv.delivery_mode <> 'direct' THEN
    RAISE EXCEPTION 'invitation_requires_account';
  END IF;

  IF _inv.rsvp_confirmed_at IS NOT NULL AND _inv.qr_code_token IS NOT NULL THEN
    RETURN jsonb_build_object(
      'invite_id', _inv.id,
      'event_id', _inv.event_id,
      'qr_code_token', _inv.qr_code_token,
      'already_confirmed', true
    );
  END IF;

  _qr := replace(gen_random_uuid()::text, '-', '');

  UPDATE public.event_special_invites
     SET rsvp_name = _n,
         rsvp_email = _e,
         guest_name = COALESCE(guest_name, _n),
         guest_email = COALESCE(guest_email, _e),
         rsvp_confirmed_at = now(),
         qr_code_token = _qr
   WHERE id = _inv.id;

  RETURN jsonb_build_object(
    'invite_id', _inv.id,
    'event_id', _inv.event_id,
    'qr_code_token', _qr,
    'already_confirmed', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_invite_rsvp(text, text, text) TO anon, authenticated;

-- Owner-only delivery mode switch
CREATE OR REPLACE FUNCTION public.set_special_invite_mode(_invite_ids uuid[], _mode text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _updated integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _mode NOT IN ('app', 'direct') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;

  UPDATE public.event_special_invites i
     SET delivery_mode = _mode
   WHERE i.id = ANY(_invite_ids)
     AND EXISTS (
       SELECT 1 FROM public.events e
        WHERE e.id = i.event_id AND e.creator_id = _uid
     );

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_special_invite_mode(uuid[], text) TO authenticated;

-- Carry direct-RSVP ticket + check-in state into the in-app guestlist entry
CREATE OR REPLACE FUNCTION public.redeem_special_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
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
           special_guest_label = COALESCE(_inv.segment, special_guest_label),
           checked_in_at = COALESCE(checked_in_at, _inv.checked_in_at),
           attended = CASE WHEN COALESCE(checked_in_at, _inv.checked_in_at) IS NOT NULL THEN true ELSE attended END
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
      (event_id, user_id, status, payment_status, is_special_guest, qr_code_token, ticket_tier_id, special_guest_label, checked_in_at, attended)
    VALUES
      (_inv.event_id, _uid, 'approved', 'confirmed', true,
       COALESCE(_inv.qr_code_token, replace(gen_random_uuid()::text, '-', '')),
       _inv.ticket_tier_id, _inv.segment, _inv.checked_in_at,
       _inv.checked_in_at IS NOT NULL)
    RETURNING id INTO _entry_id;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now(),
         qr_code_token = NULL
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_special_invite(text) TO authenticated;
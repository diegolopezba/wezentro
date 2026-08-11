ALTER TABLE public.event_special_invites
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS segment text;

CREATE INDEX IF NOT EXISTS idx_esi_event_status ON public.event_special_invites(event_id, status);
CREATE INDEX IF NOT EXISTS idx_esi_event_batch ON public.event_special_invites(event_id, batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_esi_event_email_uniq
  ON public.event_special_invites(event_id, lower(guest_email))
  WHERE guest_email IS NOT NULL;

ALTER TABLE public.guestlist_entries
  ADD COLUMN IF NOT EXISTS special_guest_label text;

-- Tighten read access: emails must not be readable by every authenticated user
DROP POLICY IF EXISTS "Authenticated users can read invites" ON public.event_special_invites;

CREATE POLICY "Redeemers can read their own invite"
ON public.event_special_invites FOR SELECT TO authenticated
USING (redeemed_by = auth.uid());

-- Token lookup for the /i/:token landing page (no email exposed)
CREATE OR REPLACE FUNCTION public.get_special_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  token text,
  status text,
  segment text,
  guest_name text,
  redeemed_by uuid,
  ticket_tier_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.event_id, i.token, i.status, i.segment, i.guest_name, i.redeemed_by, i.ticket_tier_id
  FROM public.event_special_invites i
  WHERE i.token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_special_invite_by_token(text) TO authenticated, anon;

-- Bulk creation
CREATE OR REPLACE FUNCTION public.bulk_create_special_invites(
  _event_id uuid,
  _segment text,
  _guests jsonb,
  _batch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _batch uuid := COALESCE(_batch_id, gen_random_uuid());
  _created int := 0;
  _skipped int := 0;
  _total int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events e
     WHERE e.id = _event_id AND e.creator_id = _uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not_event_owner';
  END IF;

  SELECT COUNT(*) INTO _total FROM jsonb_array_elements(_guests);
  IF _total > 500 THEN
    RAISE EXCEPTION 'batch_too_large';
  END IF;

  WITH input AS (
    SELECT
      NULLIF(btrim(g->>'name'), '') AS guest_name,
      lower(NULLIF(btrim(g->>'email'), '')) AS guest_email
    FROM jsonb_array_elements(_guests) g
  ),
  deduped AS (
    SELECT DISTINCT ON (guest_email) guest_name, guest_email
    FROM input
    WHERE guest_email IS NOT NULL
  ),
  ins AS (
    INSERT INTO public.event_special_invites
      (event_id, created_by, label, guest_name, guest_email, segment, batch_id)
    SELECT _event_id, _uid, d.guest_name, d.guest_name, d.guest_email,
           NULLIF(btrim(_segment), ''), _batch
    FROM deduped d
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO _created FROM ins;

  _skipped := _total - _created;

  RETURN jsonb_build_object('batch_id', _batch, 'created', _created, 'skipped', _skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_create_special_invites(uuid, text, jsonb, uuid) TO authenticated;

-- Carry the segment onto the guestlist entry when the invite is redeemed
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
           special_guest_label = COALESCE(_inv.segment, special_guest_label)
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
      (event_id, user_id, status, payment_status, is_special_guest, qr_code_token, ticket_tier_id, special_guest_label)
    VALUES
      (_inv.event_id, _uid, 'approved', 'confirmed', true,
       replace(gen_random_uuid()::text, '-', ''), _inv.ticket_tier_id, _inv.segment)
    RETURNING id INTO _entry_id;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_special_invite(text) TO authenticated;
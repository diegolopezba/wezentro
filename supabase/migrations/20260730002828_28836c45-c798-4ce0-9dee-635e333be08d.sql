CREATE TABLE public.event_special_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ticket_tier_id uuid REFERENCES public.ticket_tiers(id) ON DELETE SET NULL,
  label text,
  status text NOT NULL DEFAULT 'pending',
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_special_invites_event ON public.event_special_invites(event_id);
CREATE INDEX idx_event_special_invites_token ON public.event_special_invites(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_special_invites TO authenticated;
GRANT ALL ON public.event_special_invites TO service_role;

ALTER TABLE public.event_special_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their event invites"
ON public.event_special_invites FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid())
);

CREATE POLICY "Authenticated users can read invites"
ON public.event_special_invites FOR SELECT TO authenticated
USING (true);

ALTER TABLE public.guestlist_entries
  ADD COLUMN IF NOT EXISTS is_special_guest boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.redeem_special_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Already on the guestlist: make idempotent
  SELECT id INTO _entry_id FROM public.guestlist_entries
   WHERE event_id = _inv.event_id AND user_id = _uid;

  IF _entry_id IS NOT NULL THEN
    UPDATE public.guestlist_entries
       SET is_special_guest = true,
           status = 'approved',
           payment_status = 'confirmed'
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
       encode(gen_random_bytes(16), 'hex'), _inv.ticket_tier_id)
    RETURNING id INTO _entry_id;
  END IF;

  UPDATE public.event_special_invites
     SET status = 'redeemed', redeemed_by = _uid, redeemed_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('event_id', _inv.event_id, 'entry_id', _entry_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_special_invite(text) TO authenticated;
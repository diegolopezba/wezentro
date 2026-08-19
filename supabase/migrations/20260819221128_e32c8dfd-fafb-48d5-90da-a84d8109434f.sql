-- Multi-ticket purchases
ALTER TABLE public.guestlist_entries
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS purchased_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS payment_session_id uuid REFERENCES public.payment_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.guestlist_entries DROP CONSTRAINT IF EXISTS guestlist_entries_event_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS guestlist_entries_event_user_uidx
  ON public.guestlist_entries (event_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS guestlist_entries_purchaser_idx
  ON public.guestlist_entries (purchased_by_user_id);

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS assignees jsonb;

-- Buyers can see and reassign the tickets they paid for
DROP POLICY IF EXISTS "Buyers can view purchased entries" ON public.guestlist_entries;
CREATE POLICY "Buyers can view purchased entries"
ON public.guestlist_entries FOR SELECT TO authenticated
USING (auth.uid() = purchased_by_user_id);

DROP POLICY IF EXISTS "Buyers can assign purchased entries" ON public.guestlist_entries;
CREATE POLICY "Buyers can assign purchased entries"
ON public.guestlist_entries FOR UPDATE TO authenticated
USING (auth.uid() = purchased_by_user_id)
WITH CHECK (auth.uid() = purchased_by_user_id);

-- Increment tier sold count by N atomically, respecting capacity
CREATE OR REPLACE FUNCTION public.increment_tier_sold_by(_tier_id uuid, _qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cap integer;
  _sold integer;
BEGIN
  IF _qty IS NULL OR _qty < 1 THEN RETURN false; END IF;
  SELECT capacity, sold_count INTO _cap, _sold
  FROM public.ticket_tiers WHERE id = _tier_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _cap IS NOT NULL AND _sold + _qty > _cap THEN
    UPDATE public.ticket_tiers SET sold_count = COALESCE(_cap, _sold + _qty) WHERE id = _tier_id;
    RETURN false;
  END IF;
  UPDATE public.ticket_tiers SET sold_count = _sold + _qty WHERE id = _tier_id;
  RETURN true;
END;
$$;
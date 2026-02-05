-- 1. Create a public view for subscriptions that hides Stripe billing IDs
CREATE OR REPLACE VIEW public.subscriptions_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  plan_type,
  status,
  current_period_end,
  created_at
FROM public.subscriptions;

-- 2. Drop the overly permissive SELECT policy on subscriptions
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;

-- 3. Create restrictive policy - users can only see their own subscription details
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Create helper function to check if user can see full guestlist entry (with QR token)
CREATE OR REPLACE FUNCTION public.can_view_full_guestlist_entry(_user_id uuid, _entry_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _user_id = _entry_user_id  -- Entry owner
    OR EXISTS (
      SELECT 1 FROM events 
      WHERE id = _event_id AND creator_id = _user_id
    )  -- Event creator
$$;

-- 5. Create a public view for guestlist entries that hides QR tokens
CREATE OR REPLACE VIEW public.guestlist_entries_public
WITH (security_invoker = on) AS
SELECT 
  id,
  event_id,
  user_id,
  status,
  joined_at,
  attended,
  checked_in_at,
  payment_status,
  payment_confirmed_at
FROM public.guestlist_entries;

-- 6. Update the public event guestlist policy to exclude qr_code_token access
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view guestlist for public events" ON public.guestlist_entries;

-- 7. Recreate it but more restrictive - public can see entries exist, but not sensitive data
-- The view will be used for public access, direct table access requires ownership
CREATE POLICY "Users can view guestlist for public events"
ON public.guestlist_entries
FOR SELECT
USING (
  -- Own entry - can see everything including QR
  auth.uid() = user_id
  OR 
  -- Event creator - can see everything
  EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
);
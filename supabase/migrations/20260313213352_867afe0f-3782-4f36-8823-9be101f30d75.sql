
-- ============================================================
-- FIX 1: Privilege Escalation — subscriptions table
-- Remove the ALL policy that allows self-INSERT/UPDATE.
-- Stripe webhook (service role) handles all writes.
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscriptions;

-- ============================================================
-- FIX 2: Exposed sensitive data — subscriptions_public view
-- Recreate as SECURITY INVOKER so it respects underlying RLS
-- ============================================================
DROP VIEW IF EXISTS public.subscriptions_public;
CREATE VIEW public.subscriptions_public
  WITH (security_invoker = true)
AS
  SELECT id, user_id, plan_type, status, created_at, current_period_end
  FROM public.subscriptions;

-- ============================================================
-- FIX 3: Exposed sensitive data — guestlist_entries_public view
-- Recreate as SECURITY INVOKER so it respects underlying RLS
-- ============================================================
DROP VIEW IF EXISTS public.guestlist_entries_public;
CREATE VIEW public.guestlist_entries_public
  WITH (security_invoker = true)
AS
  SELECT id, event_id, user_id, status, attended, checked_in_at,
         joined_at, payment_confirmed_at, payment_status
  FROM public.guestlist_entries;

-- ============================================================
-- FIX 4: Unauthenticated notification injection
-- Restrict INSERT to authenticated users only.
-- DB triggers use SECURITY DEFINER so they are unaffected.
-- ============================================================
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- FIX 5: Remove overly broad user_settings SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view message settings" ON public.user_settings;

-- ============================================================
-- FIX 6: Remove overly broad user_category_preferences SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view category preferences for collaborative filterin" ON public.user_category_preferences;


-- Allow any authenticated user to read any subscription row
-- (subscriptions_public view strips sensitive Stripe fields via security_invoker)
CREATE POLICY "Authenticated users can view any subscription status"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow any authenticated user to see guestlist entries for public events
-- (so attendee counts and avatars work on event cards)
CREATE POLICY "Authenticated users can view guestlist entries for public events"
  ON public.guestlist_entries
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guestlist_entries.event_id
        AND events.is_public = true
        AND events.deleted_at IS NULL
    )
  );

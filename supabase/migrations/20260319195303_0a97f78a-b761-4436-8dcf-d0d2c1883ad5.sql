DROP POLICY IF EXISTS "Premium users can join guestlists" ON public.guestlist_entries;
CREATE POLICY "Authenticated users can join guestlists"
  ON public.guestlist_entries FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);
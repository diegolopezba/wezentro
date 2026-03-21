
-- Drop the restrictive SELECT policy and replace with public read access
DROP POLICY IF EXISTS "Users can view own saved events" ON public.saved_events;

-- Allow anyone (including guests) to read saved_events for count purposes
CREATE POLICY "Anyone can view save counts"
ON public.saved_events FOR SELECT
USING (true);

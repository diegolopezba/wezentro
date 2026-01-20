-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

-- Create new policy allowing authenticated users to view any subscription
CREATE POLICY "Authenticated users can view subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (true);
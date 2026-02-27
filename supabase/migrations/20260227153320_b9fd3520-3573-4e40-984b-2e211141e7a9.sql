DROP POLICY IF EXISTS "Anyone can view message settings" ON public.user_settings;
CREATE POLICY "Authenticated users can view message settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
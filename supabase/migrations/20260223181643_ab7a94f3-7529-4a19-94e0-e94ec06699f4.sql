
-- Add targeting columns to sponsored_posts
ALTER TABLE public.sponsored_posts
  ADD COLUMN IF NOT EXISTS target_categories TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_radius_km NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_gender TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_age_min INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_age_max INTEGER DEFAULT NULL;

-- Allow authenticated users to read category preferences for collaborative filtering
CREATE POLICY "Anyone can view category preferences for collaborative filtering"
  ON public.user_category_preferences
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

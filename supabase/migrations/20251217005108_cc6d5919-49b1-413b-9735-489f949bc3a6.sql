-- Create profile_photos table for user showcase photos
CREATE TABLE public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view profile photos (for public profiles)
CREATE POLICY "Anyone can view profile photos" ON public.profile_photos
  FOR SELECT USING (true);

-- Users can only manage their own photos
CREATE POLICY "Users can insert own photos" ON public.profile_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON public.profile_photos
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own photos" ON public.profile_photos
  FOR UPDATE USING (auth.uid() = user_id);
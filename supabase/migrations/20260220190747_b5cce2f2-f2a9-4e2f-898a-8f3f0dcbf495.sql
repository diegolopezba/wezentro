
-- Create profile_visits table
CREATE TABLE public.profile_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- Business owners can view visits to their profile
CREATE POLICY "Business owners can view their profile visits"
ON public.profile_visits FOR SELECT
USING (auth.uid() = profile_id);

-- Authenticated users can log visits
CREATE POLICY "Authenticated users can log profile visits"
ON public.profile_visits FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes for analytics queries
CREATE INDEX idx_profile_visits_profile_id ON public.profile_visits(profile_id);
CREATE INDEX idx_profile_visits_created_at ON public.profile_visits(created_at);

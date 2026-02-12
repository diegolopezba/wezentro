
-- Create sponsored_posts table for ad revenue
CREATE TABLE public.sponsored_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  business_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget NUMERIC,
  total_budget NUMERIC,
  spent NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsored_posts ENABLE ROW LEVEL SECURITY;

-- Business owners can CRUD their own sponsored posts
CREATE POLICY "Business owners can manage own sponsored posts"
ON public.sponsored_posts
FOR ALL
USING (auth.uid() = business_user_id);

-- All authenticated users can view active sponsored posts (for feed display)
CREATE POLICY "Authenticated users can view active sponsored posts"
ON public.sponsored_posts
FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- Index for feed queries
CREATE INDEX idx_sponsored_posts_active ON public.sponsored_posts (status, start_date, end_date) WHERE status = 'active';
CREATE INDEX idx_sponsored_posts_business_user ON public.sponsored_posts (business_user_id);

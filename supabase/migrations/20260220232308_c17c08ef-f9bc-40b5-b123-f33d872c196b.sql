
-- Add description_tags to events
ALTER TABLE public.events ADD COLUMN description_tags TEXT[] DEFAULT '{}';

-- Create user_tag_preferences to track engagement with content tags
CREATE TABLE public.user_tag_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

ALTER TABLE public.user_tag_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tag preferences" ON public.user_tag_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tag preferences" ON public.user_tag_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tag preferences" ON public.user_tag_preferences
  FOR UPDATE USING (auth.uid() = user_id);

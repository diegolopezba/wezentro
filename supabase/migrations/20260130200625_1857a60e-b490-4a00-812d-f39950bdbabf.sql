-- Create user_category_preferences table for learned category scores
CREATE TABLE public.user_category_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score DECIMAL DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Create user_creator_preferences table for creator affinity
CREATE TABLE public.user_creator_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score DECIMAL DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, creator_id)
);

-- Enable RLS on both tables
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_creator_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_category_preferences
CREATE POLICY "Users can view own category preferences"
ON public.user_category_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own category preferences"
ON public.user_category_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own category preferences"
ON public.user_category_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for user_creator_preferences
CREATE POLICY "Users can view own creator preferences"
ON public.user_creator_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own creator preferences"
ON public.user_creator_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creator preferences"
ON public.user_creator_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_user_category_preferences_user_id ON public.user_category_preferences(user_id);
CREATE INDEX idx_user_creator_preferences_user_id ON public.user_creator_preferences(user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_category_preferences_updated_at
BEFORE UPDATE ON public.user_category_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_creator_preferences_updated_at
BEFORE UPDATE ON public.user_creator_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
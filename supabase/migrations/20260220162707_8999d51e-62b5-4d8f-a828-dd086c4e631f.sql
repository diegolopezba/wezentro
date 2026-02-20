
-- Create user_day_preferences table for day-of-week category patterns
CREATE TABLE public.user_day_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  category text NOT NULL,
  score numeric DEFAULT 0,
  interaction_count integer DEFAULT 0,
  last_interaction timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week, category)
);

-- Enable RLS
ALTER TABLE public.user_day_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own day preferences"
  ON public.user_day_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day preferences"
  ON public.user_day_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day preferences"
  ON public.user_day_preferences FOR UPDATE
  USING (auth.uid() = user_id);

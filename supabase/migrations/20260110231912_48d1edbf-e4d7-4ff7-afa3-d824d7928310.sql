-- Create saved_events table
CREATE TABLE public.saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved events
CREATE POLICY "Users can view own saved events"
ON public.saved_events
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save events
CREATE POLICY "Users can save events"
ON public.saved_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave events
CREATE POLICY "Users can unsave events"
ON public.saved_events
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_saved_events_user_id ON public.saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON public.saved_events(event_id);
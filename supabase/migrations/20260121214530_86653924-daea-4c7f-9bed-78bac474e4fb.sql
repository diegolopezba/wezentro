-- Create reposts table
CREATE TABLE public.reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reposts"
ON public.reposts
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reposts"
ON public.reposts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reposts"
ON public.reposts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_reposts_user_id ON public.reposts(user_id);
CREATE INDEX idx_reposts_event_id ON public.reposts(event_id);
CREATE INDEX idx_reposts_created_at ON public.reposts(created_at DESC);

-- Create notification trigger for reposts
CREATE OR REPLACE FUNCTION public.handle_new_repost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reposter_username TEXT;
  event_creator_id UUID;
  event_title TEXT;
BEGIN
  -- Get the reposter's username
  SELECT username INTO reposter_username FROM profiles WHERE id = NEW.user_id;
  
  -- Get the event creator and title
  SELECT creator_id, title INTO event_creator_id, event_title 
  FROM events WHERE id = NEW.event_id;
  
  -- Don't notify if user reposts their own event
  IF event_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for event owner
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    event_creator_id,
    'repost',
    'New Repost',
    '@' || reposter_username || ' reposted ' || COALESCE(event_title, 'your post'),
    'event',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_repost_created
AFTER INSERT ON public.reposts
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_repost();

-- Enable realtime for reposts
ALTER PUBLICATION supabase_realtime ADD TABLE public.reposts;
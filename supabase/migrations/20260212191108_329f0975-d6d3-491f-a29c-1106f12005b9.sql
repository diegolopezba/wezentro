
-- Create event_tags table
CREATE TABLE public.event_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, tagged_user_id)
);

-- Enable RLS
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read tags (public posts show tags)
CREATE POLICY "Anyone can read tags" ON public.event_tags
  FOR SELECT USING (true);

-- Event creator can insert tags
CREATE POLICY "Event creator can tag" ON public.event_tags
  FOR INSERT WITH CHECK (
    auth.uid() = tagged_by
    AND EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
  );

-- Tagged user can update status (accept/decline)
CREATE POLICY "Tagged user can respond" ON public.event_tags
  FOR UPDATE USING (auth.uid() = tagged_user_id)
  WITH CHECK (auth.uid() = tagged_user_id);

-- Creator or tagged user can remove tags
CREATE POLICY "Creator or tagged user can remove tags" ON public.event_tags
  FOR DELETE USING (
    auth.uid() = tagged_by
    OR auth.uid() = tagged_user_id
  );

-- Notification trigger
CREATE OR REPLACE FUNCTION public.handle_event_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  tagger_username TEXT;
  event_title TEXT;
BEGIN
  SELECT username INTO tagger_username FROM profiles WHERE id = NEW.tagged_by;
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;

  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.tagged_user_id,
    'post_tag',
    'Te etiquetaron',
    '@' || tagger_username || ' te etiquetó en ' || COALESCE(event_title, 'una publicación'),
    'event',
    NEW.event_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_tag_created
  AFTER INSERT ON public.event_tags
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_tag();

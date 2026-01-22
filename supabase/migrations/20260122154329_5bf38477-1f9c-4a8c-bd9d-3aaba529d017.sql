-- Create event_collaborators table for cross-posting
CREATE TABLE public.event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view collaborators for public events
CREATE POLICY "View collaborators for public events"
ON public.event_collaborators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_collaborators.event_id 
    AND events.is_public = true 
    AND events.deleted_at IS NULL
  )
);

-- Users can view their own collaboration invites
CREATE POLICY "Users can view own collaborations"
ON public.event_collaborators
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Event creators can invite collaborators
CREATE POLICY "Event creators can invite collaborators"
ON public.event_collaborators
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_collaborators.event_id 
    AND events.creator_id = auth.uid()
  )
);

-- Invited users can respond to collaborations
CREATE POLICY "Users can respond to collaborations"
ON public.event_collaborators
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Event creators or invited users can delete collaborations
CREATE POLICY "Users can delete collaborations"
ON public.event_collaborators
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Create trigger function for collaboration notifications
CREATE OR REPLACE FUNCTION public.handle_collaboration_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inviter_username TEXT;
  event_title TEXT;
BEGIN
  -- Get inviter's username
  SELECT username INTO inviter_username FROM profiles WHERE id = NEW.invited_by;
  
  -- Get event title
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  
  -- Create notification for invited user
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.user_id,
    'collaboration_request',
    'Invitación de colaboración',
    '@' || inviter_username || ' te invitó a colaborar en ' || COALESCE(event_title, 'una publicación'),
    'event',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_collaboration_invite
AFTER INSERT ON public.event_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.handle_collaboration_invite();

-- Create trigger function for accepted collaborations
CREATE OR REPLACE FUNCTION public.handle_collaboration_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  collaborator_username TEXT;
  event_title TEXT;
  event_creator_id UUID;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get collaborator's username
    SELECT username INTO collaborator_username FROM profiles WHERE id = NEW.user_id;
    
    -- Get event details
    SELECT title, creator_id INTO event_title, event_creator_id FROM events WHERE id = NEW.event_id;
    
    -- Notify the event creator
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (
      event_creator_id,
      'collaboration_accepted',
      'Colaboración aceptada',
      '@' || collaborator_username || ' aceptó colaborar en ' || COALESCE(event_title, 'tu publicación'),
      'event',
      NEW.event_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for accepted collaborations
CREATE TRIGGER on_collaboration_accepted
AFTER UPDATE ON public.event_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.handle_collaboration_accepted();
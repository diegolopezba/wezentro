-- Create guestlist_invitations table
CREATE TABLE public.guestlist_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id),
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.guestlist_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Event creators can view invitations for their events
CREATE POLICY "Event creators can view invitations"
ON public.guestlist_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guestlist_invitations.event_id
    AND events.creator_id = auth.uid()
  )
);

-- Policy: Event creators can insert invitations for their events
CREATE POLICY "Event creators can send invitations"
ON public.guestlist_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id
  AND EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guestlist_invitations.event_id
    AND events.creator_id = auth.uid()
  )
);

-- Policy: Invited users can view their invitations
CREATE POLICY "Users can view their invitations"
ON public.guestlist_invitations
FOR SELECT
USING (auth.uid() = invited_user_id);

-- Policy: Invited users can update (respond to) their invitations
CREATE POLICY "Users can respond to invitations"
ON public.guestlist_invitations
FOR UPDATE
USING (auth.uid() = invited_user_id)
WITH CHECK (auth.uid() = invited_user_id);

-- Create trigger function to auto-create notification
CREATE OR REPLACE FUNCTION public.handle_guestlist_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
  inviter_username TEXT;
BEGIN
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  SELECT username INTO inviter_username FROM profiles WHERE id = NEW.inviter_id;
  
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.invited_user_id,
    'guestlist_invitation',
    'Guestlist Invitation',
    '@' || inviter_username || ' invited you to join ' || COALESCE(event_title, 'an event'),
    'event',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_guestlist_invitation_created
AFTER INSERT ON public.guestlist_invitations
FOR EACH ROW
EXECUTE FUNCTION public.handle_guestlist_invitation();
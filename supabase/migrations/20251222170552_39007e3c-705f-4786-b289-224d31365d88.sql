-- Create function to automatically add user to event chat on guestlist approval
CREATE OR REPLACE FUNCTION public.add_user_to_event_chat_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  _chat_id UUID;
BEGIN
  -- Only run when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Find the event's group chat
    SELECT id INTO _chat_id FROM public.chats 
    WHERE event_id = NEW.event_id AND type = 'event';
    
    IF _chat_id IS NOT NULL THEN
      -- Add user to chat (ignore if already exists)
      INSERT INTO public.chat_participants (chat_id, user_id)
      VALUES (_chat_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on guestlist_entries
CREATE TRIGGER on_guestlist_approved_add_to_chat
  AFTER UPDATE ON public.guestlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_event_chat_on_approval();
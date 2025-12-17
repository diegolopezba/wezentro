-- Create function to handle guestlist request notifications
CREATE OR REPLACE FUNCTION public.handle_guestlist_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_username TEXT;
  event_creator_id UUID;
  event_title TEXT;
BEGIN
  -- Get the requester's username
  SELECT username INTO requester_username FROM profiles WHERE id = NEW.user_id;
  
  -- Get the event creator and title
  SELECT creator_id, title INTO event_creator_id, event_title 
  FROM events WHERE id = NEW.event_id;
  
  -- Don't notify if creator is joining their own event
  IF event_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for event owner
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    event_creator_id,
    'guestlist_request',
    'Guestlist Request',
    '@' || requester_username || ' wants to join ' || COALESCE(event_title, 'your event'),
    'event',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for guestlist requests
CREATE TRIGGER on_guestlist_request
  AFTER INSERT ON guestlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_guestlist_request();
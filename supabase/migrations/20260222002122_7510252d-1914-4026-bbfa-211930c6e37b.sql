
-- Create trigger function for like notifications
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  liker_username TEXT;
  event_creator_id UUID;
  event_title TEXT;
BEGIN
  -- Get the liker's username
  SELECT username INTO liker_username FROM profiles WHERE id = NEW.user_id;
  
  -- Get the event creator and title
  SELECT creator_id, title INTO event_creator_id, event_title 
  FROM events WHERE id = NEW.event_id;
  
  -- Don't notify if user likes their own event
  IF event_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for event owner
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    event_creator_id,
    'like',
    'Nuevo like',
    '@' || liker_username || ' le dio like a ' || COALESCE(event_title, 'tu publicación'),
    'event',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger on event_likes table
CREATE TRIGGER on_new_like
  AFTER INSERT ON public.event_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_like();

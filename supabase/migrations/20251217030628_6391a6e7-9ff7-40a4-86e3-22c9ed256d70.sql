-- Create function to handle guestlist approval/rejection notifications
CREATE OR REPLACE FUNCTION public.handle_guestlist_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_title TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get the event title
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
  
  -- Create notification based on new status
  IF NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (
      NEW.user_id,
      'guestlist_approved',
      'Guestlist Approved',
      'You''re on the guestlist for ' || COALESCE(event_title, 'an event') || '!',
      'event',
      NEW.event_id
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (
      NEW.user_id,
      'guestlist_rejected',
      'Guestlist Request Declined',
      'Your request to join ' || COALESCE(event_title, 'an event') || ' was declined',
      'event',
      NEW.event_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for guestlist status changes
CREATE TRIGGER on_guestlist_status_change
  AFTER UPDATE ON guestlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_guestlist_status_change();
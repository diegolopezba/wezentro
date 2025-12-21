-- Create function to automatically create event group chat
CREATE OR REPLACE FUNCTION public.create_event_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  new_chat_id UUID;
BEGIN
  -- Only create chat if event has guestlist enabled
  IF NEW.has_guestlist = true THEN
    -- Create the event group chat
    INSERT INTO chats (type, name, event_id)
    VALUES ('event', NEW.title, NEW.id)
    RETURNING id INTO new_chat_id;
    
    -- Add event creator as first participant
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (new_chat_id, NEW.creator_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new events
CREATE TRIGGER on_event_created_create_chat
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_group_chat();

-- Fix existing events: Create chats for events with guestlists that don't have a chat
INSERT INTO chats (type, name, event_id)
SELECT 'event', e.title, e.id 
FROM events e
WHERE e.has_guestlist = true 
AND e.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM chats c WHERE c.event_id = e.id);

-- Add creators as participants to those new chats
INSERT INTO chat_participants (chat_id, user_id)
SELECT c.id, e.creator_id
FROM chats c
JOIN events e ON c.event_id = e.id
WHERE c.type = 'event'
AND NOT EXISTS (
  SELECT 1 FROM chat_participants cp 
  WHERE cp.chat_id = c.id AND cp.user_id = e.creator_id
);
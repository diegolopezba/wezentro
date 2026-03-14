
CREATE OR REPLACE FUNCTION public.create_event_group_chat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_chat_id UUID;
BEGIN
  -- Only create chat if event has guestlist enabled AND group chat is enabled
  IF NEW.has_guestlist = true AND NEW.has_guestlist_chat = true THEN
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
$function$

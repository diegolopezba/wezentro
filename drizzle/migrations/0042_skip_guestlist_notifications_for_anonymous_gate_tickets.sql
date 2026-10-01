CREATE OR REPLACE FUNCTION public.handle_guestlist_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requester_username text; event_creator_id uuid; event_title text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT username INTO requester_username FROM public.profiles WHERE id = NEW.user_id;
  SELECT creator_id, title INTO event_creator_id, event_title FROM public.events WHERE id = NEW.event_id;
  IF event_creator_id = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (event_creator_id, 'guestlist_request', 'Guestlist Request', '@' || COALESCE(requester_username, 'usuario') || ' wants to join ' || COALESCE(event_title, 'your event'), 'event', NEW.event_id);
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.handle_guestlist_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE event_title text;
BEGIN
  IF NEW.user_id IS NULL OR OLD.status = NEW.status THEN RETURN NEW; END IF;
  SELECT title INTO event_title FROM public.events WHERE id = NEW.event_id;
  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (NEW.user_id, 'guestlist_approved', 'Guestlist Approved', 'You''re on the guestlist for ' || COALESCE(event_title, 'an event') || '!', 'event', NEW.event_id);
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (NEW.user_id, 'guestlist_rejected', 'Guestlist Request Declined', 'Your request to join ' || COALESCE(event_title, 'an event') || ' was declined', 'event', NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;
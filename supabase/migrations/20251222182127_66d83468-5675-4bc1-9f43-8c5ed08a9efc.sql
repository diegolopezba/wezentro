-- Drop the existing trigger that only fires on UPDATE
DROP TRIGGER IF EXISTS on_guestlist_approved_add_to_chat ON public.guestlist_entries;

-- Recreate with INSERT and UPDATE events so invitation acceptances also trigger chat addition
CREATE TRIGGER on_guestlist_approved_add_to_chat
  AFTER INSERT OR UPDATE ON public.guestlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_event_chat_on_approval();

-- Add the user who accepted the invitation but wasn't added to the chat
INSERT INTO public.chat_participants (chat_id, user_id)
VALUES ('a51db91c-c211-4462-9017-760792511d2f', 'd02a8d43-b650-4b27-9098-d3b422ad3569')
ON CONFLICT DO NOTHING;
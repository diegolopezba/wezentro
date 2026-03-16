
-- Drop triggers (cascade handles dependent function references)
DROP TRIGGER IF EXISTS on_event_created_create_chat ON public.events;
DROP TRIGGER IF EXISTS on_event_created_create_group_chat ON public.events;
DROP TRIGGER IF EXISTS on_guestlist_approved_add_to_chat ON public.guestlist_entries;

-- Drop the functions
DROP FUNCTION IF EXISTS public.create_event_group_chat() CASCADE;
DROP FUNCTION IF EXISTS public.add_user_to_event_chat_on_approval() CASCADE;

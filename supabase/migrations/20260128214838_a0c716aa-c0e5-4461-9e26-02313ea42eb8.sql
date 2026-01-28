-- Add column for optional group chat on guestlist events
ALTER TABLE public.events
ADD COLUMN has_guestlist_chat BOOLEAN DEFAULT true;

-- Set existing events with guestlists to have chat enabled (maintaining current behavior)
UPDATE public.events
SET has_guestlist_chat = true
WHERE has_guestlist = true;
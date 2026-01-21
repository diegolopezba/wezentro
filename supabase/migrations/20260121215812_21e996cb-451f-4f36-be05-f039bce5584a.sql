-- Add 'repost' to the notifications_type_check constraint
-- First drop the existing constraint, then add updated one
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'guestlist_request', 'guestlist_approved', 'guestlist_rejected', 'guestlist_invitation', 'message', 'event_reminder', 'repost'));
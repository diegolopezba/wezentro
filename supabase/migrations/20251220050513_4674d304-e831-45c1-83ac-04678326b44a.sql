-- Drop the existing constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add new constraint with guestlist_invite included
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type = ANY (ARRAY['text'::text, 'event_card'::text, 'event_invite'::text, 'guestlist_invite'::text, 'system'::text]));
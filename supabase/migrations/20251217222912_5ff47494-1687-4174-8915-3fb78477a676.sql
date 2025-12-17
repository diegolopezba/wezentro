-- Drop the old constraint and add a new one that includes 'event_invite'
ALTER TABLE public.messages DROP CONSTRAINT messages_message_type_check;

ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type = ANY (ARRAY['text'::text, 'event_card'::text, 'event_invite'::text, 'system'::text]));
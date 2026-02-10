ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_check CHECK (entity_type IN ('event', 'user', 'chat', 'reservation'));
ALTER TABLE public.event_interactions DROP CONSTRAINT event_interactions_type_check;

ALTER TABLE public.event_interactions ADD CONSTRAINT event_interactions_type_check 
CHECK (type = ANY (ARRAY['view'::text, 'join'::text, 'checkin'::text, 'share'::text, 'scroll_past'::text, 'save'::text, 'like'::text, 'repost'::text, 'click'::text, 'not_interested'::text]));
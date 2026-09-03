ALTER TABLE public.venue_layout_areas DROP CONSTRAINT IF EXISTS venue_layout_areas_capacity_check;
ALTER TABLE public.venue_layout_areas ADD CONSTRAINT venue_layout_areas_capacity_check CHECK (capacity > 0 OR is_decor = true);

ALTER TABLE public.event_areas DROP CONSTRAINT IF EXISTS event_areas_capacity_check;
ALTER TABLE public.event_areas ADD CONSTRAINT event_areas_capacity_check CHECK (capacity > 0 OR is_decor = true);
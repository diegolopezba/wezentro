ALTER TABLE public.event_interactions DROP CONSTRAINT IF EXISTS event_interactions_type_check;

ALTER TABLE public.event_interactions
  ADD CONSTRAINT event_interactions_type_check
  CHECK (type = ANY (ARRAY[
    'view','impression','join','checkin','share','scroll_past','save','like',
    'repost','click','not_interested','dwell','checkout_tap','menu_view','reserve_tap'
  ]));

CREATE INDEX IF NOT EXISTS idx_event_interactions_event_type_created
  ON public.event_interactions (event_id, type, created_at DESC);
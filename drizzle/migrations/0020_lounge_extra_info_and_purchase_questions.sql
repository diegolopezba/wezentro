ALTER TABLE public.venue_layout_areas
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS perks text[],
  ADD COLUMN IF NOT EXISTS arrival_note text;

ALTER TABLE public.event_areas
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS perks text[],
  ADD COLUMN IF NOT EXISTS arrival_note text;

ALTER TABLE public.area_bookings
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.event_purchase_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'short_text',
  required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope text NOT NULL DEFAULT 'areas',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_purchase_questions_type_check CHECK (type IN ('short_text','long_text','phone','boolean','select')),
  CONSTRAINT event_purchase_questions_scope_check CHECK (scope IN ('areas','all'))
);

CREATE INDEX IF NOT EXISTS event_purchase_questions_event_idx
  ON public.event_purchase_questions(event_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_purchase_questions TO authenticated;
GRANT SELECT ON public.event_purchase_questions TO anon;
GRANT ALL ON public.event_purchase_questions TO service_role;

ALTER TABLE public.event_purchase_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event purchase questions"
  ON public.event_purchase_questions FOR SELECT
  USING (true);

CREATE POLICY "Event owners manage purchase questions"
  ON public.event_purchase_questions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));
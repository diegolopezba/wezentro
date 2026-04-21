-- Multiple ticket tiers (Shotgun + Dice model)

CREATE TABLE public.ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  capacity INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  unlock_after_tier_id UUID REFERENCES public.ticket_tiers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_tiers_price_nonneg CHECK (price >= 0),
  CONSTRAINT ticket_tiers_capacity_pos CHECK (capacity IS NULL OR capacity >= 1),
  CONSTRAINT ticket_tiers_sold_nonneg CHECK (sold_count >= 0)
);

CREATE INDEX idx_ticket_tiers_event ON public.ticket_tiers(event_id, display_order);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Anyone can view tiers for public events
CREATE POLICY "Anyone can view tiers for public events"
ON public.ticket_tiers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id
      AND e.is_public = true
      AND e.deleted_at IS NULL
  )
);

-- Event creators can view their own tiers (incl. private/draft)
CREATE POLICY "Creators can view own tiers"
ON public.ticket_tiers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can insert tiers"
ON public.ticket_tiers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can update tiers"
ON public.ticket_tiers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can delete tiers"
ON public.ticket_tiers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id AND e.creator_id = auth.uid()
  )
);

CREATE TRIGGER trg_ticket_tiers_updated_at
BEFORE UPDATE ON public.ticket_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK columns on existing tables
ALTER TABLE public.guestlist_entries
  ADD COLUMN ticket_tier_id UUID REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;

ALTER TABLE public.payment_sessions
  ADD COLUMN ticket_tier_id UUID REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;

-- Atomic increment with capacity check (returns true if incremented, false if sold out)
CREATE OR REPLACE FUNCTION public.increment_tier_sold(_tier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated INT;
BEGIN
  UPDATE public.ticket_tiers
     SET sold_count = sold_count + 1,
         updated_at = now()
   WHERE id = _tier_id
     AND (capacity IS NULL OR sold_count < capacity);
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;
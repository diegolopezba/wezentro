ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS waitlist_tier_id uuid REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.events.waitlist_tier_id IS 'Ticket tier the pre-sale waiting list applies to. During early access only this tier is purchasable by list members.';
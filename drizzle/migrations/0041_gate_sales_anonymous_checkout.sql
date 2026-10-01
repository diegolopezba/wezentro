CREATE TABLE public.gate_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  price numeric(12,2) NOT NULL CHECK (price > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_offers TO authenticated;
GRANT ALL ON public.gate_offers TO service_role;
ALTER TABLE public.gate_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event owners manage gate offers" ON public.gate_offers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));
CREATE INDEX gate_offers_event_idx ON public.gate_offers(event_id);
ALTER TABLE public.payment_sessions ALTER COLUMN buyer_user_id DROP NOT NULL;
ALTER TABLE public.payment_sessions ADD COLUMN is_gate_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.payment_sessions ADD COLUMN gate_offer_id uuid REFERENCES public.gate_offers(id) ON DELETE SET NULL;
ALTER TABLE public.payment_sessions ADD COLUMN gate_access_token uuid UNIQUE;
ALTER TABLE public.guestlist_entries ADD COLUMN gate_ticket_index integer;
CREATE UNIQUE INDEX gate_ticket_per_session_idx ON public.guestlist_entries(payment_session_id, gate_ticket_index) WHERE gate_ticket_index IS NOT NULL;
CREATE INDEX payment_sessions_gate_event_idx ON public.payment_sessions(event_id, confirmed_at) WHERE is_gate_sale = true AND status = 'confirmed';
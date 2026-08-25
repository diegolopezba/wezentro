CREATE TABLE public.event_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sent',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_announcements_event ON public.event_announcements(event_id, created_at DESC);
CREATE INDEX idx_event_announcements_due ON public.event_announcements(scheduled_for) WHERE status = 'scheduled';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_announcements TO authenticated;
GRANT ALL ON public.event_announcements TO service_role;

ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their event announcements"
ON public.event_announcements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

CREATE POLICY "Owners can create announcements for their events"
ON public.event_announcements FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid())
);

CREATE POLICY "Owners can update their event announcements"
ON public.event_announcements FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

CREATE TRIGGER update_event_announcements_updated_at
BEFORE UPDATE ON public.event_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolve confirmed attendees for an event.
CREATE OR REPLACE FUNCTION public.get_event_announcement_recipients(_event_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owner AS (
    SELECT creator_id FROM public.events WHERE id = _event_id
  ),
  people AS (
    SELECT ge.user_id
    FROM public.guestlist_entries ge
    WHERE ge.event_id = _event_id AND ge.status = 'approved' AND ge.user_id IS NOT NULL
    UNION
    SELECT ps.buyer_user_id
    FROM public.payment_sessions ps
    WHERE ps.event_id = _event_id AND ps.status = 'paid'
    UNION
    SELECT si.redeemed_by
    FROM public.event_special_invites si
    WHERE si.event_id = _event_id AND si.status = 'redeemed' AND si.redeemed_by IS NOT NULL
  )
  SELECT DISTINCT p.user_id
  FROM people p, owner o
  WHERE p.user_id IS NOT NULL
    AND p.user_id <> o.creator_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = o.creator_id AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = o.creator_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.count_event_announcements_24h(_event_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.event_announcements
  WHERE event_id = _event_id
    AND status <> 'cancelled'
    AND created_at > now() - interval '24 hours';
$$;

GRANT EXECUTE ON FUNCTION public.get_event_announcement_recipients(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_event_announcements_24h(UUID) TO authenticated, service_role;
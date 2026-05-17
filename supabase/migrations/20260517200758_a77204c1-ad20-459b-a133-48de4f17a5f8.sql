-- Create table
CREATE TABLE public.post_business_cta_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  business_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  revoked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT post_business_cta_status_check CHECK (status IN ('pending','accepted','declined','revoked')),
  CONSTRAINT post_business_cta_revoker_check CHECK (revoked_by IS NULL OR revoked_by IN ('user','business'))
);

CREATE UNIQUE INDEX post_business_cta_one_active
  ON public.post_business_cta_requests (event_id, business_id)
  WHERE status IN ('pending','accepted');

CREATE INDEX post_business_cta_event_idx ON public.post_business_cta_requests (event_id);
CREATE INDEX post_business_cta_business_idx ON public.post_business_cta_requests (business_id);

ALTER TABLE public.post_business_cta_requests ENABLE ROW LEVEL SECURITY;

-- Helper function: is the viewer the post owner?
CREATE OR REPLACE FUNCTION public.is_post_owner(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = _event_id AND creator_id = _user_id
  )
$$;

-- SELECT: public can see accepted; owner & business can see their own
CREATE POLICY "Anyone can view accepted CTA requests"
  ON public.post_business_cta_requests
  FOR SELECT
  USING (status = 'accepted');

CREATE POLICY "Business can view own CTA requests"
  ON public.post_business_cta_requests
  FOR SELECT
  USING (auth.uid() = business_id);

CREATE POLICY "Post owner can view CTA requests on their post"
  ON public.post_business_cta_requests
  FOR SELECT
  USING (public.is_post_owner(auth.uid(), event_id));

-- INSERT: only the business itself, must have an accepted tag, must be a business
CREATE POLICY "Tagged business can request CTA"
  ON public.post_business_cta_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = business_id
    AND auth.uid() = requested_by
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_business = true
    )
    AND EXISTS (
      SELECT 1 FROM public.event_tags t
      WHERE t.event_id = post_business_cta_requests.event_id
        AND t.tagged_user_id = auth.uid()
        AND t.status = 'accepted'
    )
  );

-- UPDATE: post owner can accept/decline/revoke; business can revoke
CREATE POLICY "Post owner can respond to CTA request"
  ON public.post_business_cta_requests
  FOR UPDATE
  USING (public.is_post_owner(auth.uid(), event_id))
  WITH CHECK (public.is_post_owner(auth.uid(), event_id));

CREATE POLICY "Business can revoke own CTA request"
  ON public.post_business_cta_requests
  FOR UPDATE
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

-- Notifications trigger
CREATE OR REPLACE FUNCTION public.handle_business_cta_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_username TEXT;
  business_display TEXT;
  post_owner_id UUID;
  event_title TEXT;
BEGIN
  SELECT creator_id, title INTO post_owner_id, event_title
  FROM events WHERE id = NEW.event_id;

  SELECT username, COALESCE(full_name, username) INTO business_username, business_display
  FROM profiles WHERE id = NEW.business_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (
      post_owner_id,
      'business_cta_request',
      'Solicitud de botones',
      COALESCE(business_display, '@' || business_username) || ' quiere agregar sus botones de menú y reserva a tu publicación',
      'event',
      NEW.event_id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.business_id,
        'business_cta_accepted',
        'Solicitud aceptada',
        'Tus botones de menú y reserva ahora aparecen en ' || COALESCE(event_title, 'la publicación'),
        'event',
        NEW.event_id
      );
    ELSIF NEW.status = 'declined' THEN
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.business_id,
        'business_cta_declined',
        'Solicitud rechazada',
        'Tu solicitud de botones en ' || COALESCE(event_title, 'la publicación') || ' fue rechazada',
        'event',
        NEW.event_id
      );
    ELSIF NEW.status = 'revoked' AND NEW.revoked_by = 'user' THEN
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (
        NEW.business_id,
        'business_cta_revoked',
        'Botones removidos',
        'El autor removió tus botones de ' || COALESCE(event_title, 'la publicación'),
        'event',
        NEW.event_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER post_business_cta_notify
  AFTER INSERT OR UPDATE ON public.post_business_cta_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_business_cta_request_change();
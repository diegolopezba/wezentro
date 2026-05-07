
CREATE TABLE public.event_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  display_order INT NOT NULL CHECK (display_order BETWEEN 0 AND 4),
  aspect_ratio NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, display_order)
);

CREATE INDEX idx_event_media_event_order ON public.event_media(event_id, display_order);

ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media of public events"
ON public.event_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id
      AND e.is_public = true
      AND e.deleted_at IS NULL
  )
);

CREATE POLICY "Creators can view media of own events"
ON public.event_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can insert media for own events"
ON public.event_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can update media of own events"
ON public.event_media FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id AND e.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can delete media of own events"
ON public.event_media FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id AND e.creator_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.sync_event_cover_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id UUID;
  _cover TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _event_id := OLD.event_id;
  ELSE
    _event_id := NEW.event_id;
  END IF;

  SELECT media_url INTO _cover
  FROM public.event_media
  WHERE event_id = _event_id
  ORDER BY display_order ASC
  LIMIT 1;

  UPDATE public.events
  SET image_url = _cover
  WHERE id = _event_id
    AND image_url IS DISTINCT FROM _cover;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_event_media_sync_cover
AFTER INSERT OR UPDATE OR DELETE ON public.event_media
FOR EACH ROW EXECUTE FUNCTION public.sync_event_cover_image();

INSERT INTO public.event_media (event_id, media_url, media_type, display_order)
SELECT
  e.id,
  e.image_url,
  CASE
    WHEN lower(split_part(e.image_url, '.', array_length(string_to_array(e.image_url, '.'), 1)))
      IN ('mp4','webm','mov','quicktime') THEN 'video'
    ELSE 'image'
  END,
  0
FROM public.events e
WHERE e.image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.event_media em WHERE em.event_id = e.id
  );

DROP FUNCTION IF EXISTS public.get_for_you_events();

CREATE OR REPLACE FUNCTION public.get_for_you_events()
 RETURNS TABLE(id uuid, title text, description text, description_tags text[], image_url text, category text, location_name text, latitude double precision, longitude double precision, start_datetime timestamp with time zone, end_datetime timestamp with time zone, price numeric, has_guestlist boolean, has_guestlist_chat boolean, max_guestlist_capacity integer, is_post boolean, is_public boolean, is_business_event boolean, show_menu_button boolean, show_reservation_button boolean, payment_qr_url text, creator_id uuid, created_at timestamp with time zone, creator_username text, creator_full_name text, creator_avatar_url text, attendee_count bigint, attendee_avatars jsonb, media jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id, e.title, e.description, e.description_tags, e.image_url, e.category,
    e.location_name, e.latitude, e.longitude, e.start_datetime, e.end_datetime,
    e.price, e.has_guestlist, e.has_guestlist_chat, e.max_guestlist_capacity,
    e.is_post, e.is_public, e.is_business_event, e.show_menu_button,
    e.show_reservation_button, e.payment_qr_url, e.creator_id, e.created_at,
    p.username, p.full_name, p.avatar_url,
    COALESCE(att.attendee_count, 0),
    COALESCE(att.attendee_avatars, '[]'::jsonb),
    COALESCE(med.media, '[]'::jsonb)
  FROM public.events e
  LEFT JOIN public.profiles p ON p.id = e.creator_id
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) AS attendee_count,
      jsonb_agg(
        jsonb_build_object('id', sub.user_id, 'avatar_url', sub.avatar_url)
        ORDER BY sub.joined_at ASC
      ) FILTER (WHERE sub.rn <= 5) AS attendee_avatars
    FROM (
      SELECT 
        ge.user_id, ge.joined_at, prof.avatar_url,
        ROW_NUMBER() OVER (ORDER BY ge.joined_at ASC) AS rn
      FROM public.guestlist_entries ge
      LEFT JOIN public.profiles prof ON prof.id = ge.user_id
      WHERE ge.event_id = e.id AND ge.status = 'approved'
    ) sub
  ) att ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', em.id,
        'media_url', em.media_url,
        'media_type', em.media_type,
        'display_order', em.display_order,
        'aspect_ratio', em.aspect_ratio
      ) ORDER BY em.display_order ASC
    ) AS media
    FROM public.event_media em
    WHERE em.event_id = e.id
  ) med ON true
  WHERE e.is_public = true
    AND e.deleted_at IS NULL
    AND (e.is_post = true OR e.start_datetime >= now())
  ORDER BY e.created_at DESC
  LIMIT 200;
$function$;

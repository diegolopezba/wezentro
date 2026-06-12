
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_location_secret boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_see_event_location(_user uuid, _event uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event
      AND (
        e.is_location_secret = false
        OR e.creator_id = _user
        OR EXISTS (
          SELECT 1 FROM public.guestlist_entries ge
          WHERE ge.event_id = _event
            AND ge.user_id = _user
            AND ge.status = 'approved'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.notify_secret_location_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_location_secret IS TRUE
     AND (
       COALESCE(NEW.location_name, '') IS DISTINCT FROM COALESCE(OLD.location_name, '')
       OR COALESCE(NEW.latitude, 0) IS DISTINCT FROM COALESCE(OLD.latitude, 0)
       OR COALESCE(NEW.longitude, 0) IS DISTINCT FROM COALESCE(OLD.longitude, 0)
     )
  THEN
    INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
    SELECT
      ge.user_id,
      'secret_location_changed',
      'Nueva ubicación secreta',
      COALESCE(NEW.title, 'Un evento') || ' cambió de ubicación',
      'event',
      NEW.id
    FROM public.guestlist_entries ge
    WHERE ge.event_id = NEW.id
      AND ge.status = 'approved'
      AND ge.user_id <> NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_secret_location_change ON public.events;
CREATE TRIGGER trg_notify_secret_location_change
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.notify_secret_location_change();

CREATE OR REPLACE FUNCTION public.get_for_you_events()
 RETURNS TABLE(id uuid, title text, description text, description_tags text[], image_url text, category text, location_name text, latitude double precision, longitude double precision, start_datetime timestamp with time zone, end_datetime timestamp with time zone, price numeric, has_guestlist boolean, has_guestlist_chat boolean, max_guestlist_capacity integer, is_post boolean, is_public boolean, is_business_event boolean, show_menu_button boolean, show_reservation_button boolean, payment_qr_url text, creator_id uuid, created_at timestamp with time zone, creator_username text, creator_full_name text, creator_avatar_url text, attendee_count bigint, attendee_avatars jsonb, media jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id, e.title, e.description, e.description_tags, e.image_url, e.category,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.location_name END,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.latitude END,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.longitude END,
    e.start_datetime, e.end_datetime,
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

CREATE OR REPLACE FUNCTION public.get_for_you_events(_limit integer DEFAULT 20, _cursor timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, title text, description text, description_tags text[], image_url text, category text, location_name text, latitude double precision, longitude double precision, start_datetime timestamp with time zone, end_datetime timestamp with time zone, price numeric, has_guestlist boolean, has_guestlist_chat boolean, max_guestlist_capacity integer, is_post boolean, is_public boolean, is_business_event boolean, show_menu_button boolean, show_reservation_button boolean, payment_qr_url text, creator_id uuid, created_at timestamp with time zone, creator_username text, creator_full_name text, creator_avatar_url text, attendee_count bigint, attendee_avatars jsonb, media jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id, e.title, e.description, e.description_tags, e.image_url, e.category,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.location_name END,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.latitude END,
    CASE WHEN e.is_location_secret AND NOT public.can_see_event_location(auth.uid(), e.id) THEN NULL ELSE e.longitude END,
    e.start_datetime, e.end_datetime,
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
    AND (_cursor IS NULL OR e.created_at < _cursor)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(_limit, 20), 50), 1);
$function$;

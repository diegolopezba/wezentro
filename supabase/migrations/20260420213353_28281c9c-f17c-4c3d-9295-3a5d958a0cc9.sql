CREATE OR REPLACE FUNCTION public.get_for_you_events()
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  description_tags text[],
  image_url text,
  category text,
  location_name text,
  latitude double precision,
  longitude double precision,
  start_datetime timestamptz,
  end_datetime timestamptz,
  price numeric,
  has_guestlist boolean,
  has_guestlist_chat boolean,
  max_guestlist_capacity integer,
  is_post boolean,
  is_public boolean,
  is_business_event boolean,
  show_menu_button boolean,
  show_reservation_button boolean,
  payment_qr_url text,
  creator_id uuid,
  created_at timestamptz,
  creator_username text,
  creator_full_name text,
  creator_avatar_url text,
  attendee_count bigint,
  attendee_avatars jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.description_tags,
    e.image_url,
    e.category,
    e.location_name,
    e.latitude,
    e.longitude,
    e.start_datetime,
    e.end_datetime,
    e.price,
    e.has_guestlist,
    e.has_guestlist_chat,
    e.max_guestlist_capacity,
    e.is_post,
    e.is_public,
    e.is_business_event,
    e.show_menu_button,
    e.show_reservation_button,
    e.payment_qr_url,
    e.creator_id,
    e.created_at,
    p.username AS creator_username,
    p.full_name AS creator_full_name,
    p.avatar_url AS creator_avatar_url,
    COALESCE(att.attendee_count, 0) AS attendee_count,
    COALESCE(att.attendee_avatars, '[]'::jsonb) AS attendee_avatars
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
        ge.user_id,
        ge.joined_at,
        prof.avatar_url,
        ROW_NUMBER() OVER (ORDER BY ge.joined_at ASC) AS rn
      FROM public.guestlist_entries ge
      LEFT JOIN public.profiles prof ON prof.id = ge.user_id
      WHERE ge.event_id = e.id
        AND ge.status = 'approved'
    ) sub
  ) att ON true
  WHERE e.is_public = true
    AND e.deleted_at IS NULL
    AND (e.is_post = true OR e.start_datetime >= now())
  ORDER BY e.created_at DESC
  LIMIT 200;
$$;
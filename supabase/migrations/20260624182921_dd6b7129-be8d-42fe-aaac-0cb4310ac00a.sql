
CREATE OR REPLACE FUNCTION public.refresh_trending_scores_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.trending_scores_cache;
  INSERT INTO public.trending_scores_cache (event_id, trending_score, velocity_count, updated_at)
  WITH signals AS (
    SELECT event_id, created_at, 3::int AS w, 'like'::text AS kind
      FROM public.event_likes WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 5, 'save'
      FROM public.saved_events WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, joined_at AS created_at, 5, 'join'
      FROM public.guestlist_entries
      WHERE status = 'approved' AND joined_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 3, 'repost'
      FROM public.reposts WHERE created_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT event_id, created_at, 1, 'click'
      FROM public.interaction_events_log
      WHERE signal_type = 'click' AND created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT
    s.event_id,
    COALESCE(SUM(s.w), 0)::numeric AS trending_score,
    COUNT(*) FILTER (
      WHERE s.created_at >= NOW() - INTERVAL '2 hours'
        AND s.kind IN ('join', 'save', 'like', 'repost')
    )::bigint AS velocity_count,
    now()
  FROM signals s
  GROUP BY s.event_id;
END;
$function$;

SELECT public.refresh_trending_scores_cache();

DROP FUNCTION IF EXISTS public.get_for_you_events(integer, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_for_you_events();

CREATE FUNCTION public.get_for_you_events(_limit integer DEFAULT 200, _cursor timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS TABLE(
  id uuid, title text, description text, description_tags text[], image_url text, category text,
  location_name text, latitude double precision, longitude double precision,
  start_datetime timestamp with time zone, end_datetime timestamp with time zone,
  price numeric, has_guestlist boolean, has_guestlist_chat boolean, max_guestlist_capacity integer,
  is_post boolean, is_public boolean, is_business_event boolean, show_menu_button boolean,
  show_reservation_button boolean, payment_qr_url text, creator_id uuid, created_at timestamp with time zone,
  creator_username text, creator_full_name text, creator_avatar_url text,
  attendee_count bigint, attendee_avatars jsonb, media jsonb,
  like_count bigint, save_count bigint, impression_count bigint
)
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
    COALESCE(med.media, '[]'::jsonb),
    COALESCE(lc.like_count, 0)::bigint,
    COALESCE(sc.save_count, 0)::bigint,
    COALESCE(es.impression_count, 0)::bigint
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
      SELECT ge.user_id, ge.joined_at, prof.avatar_url,
        ROW_NUMBER() OVER (ORDER BY ge.joined_at ASC) AS rn
      FROM public.guestlist_entries ge
      LEFT JOIN public.profiles prof ON prof.id = ge.user_id
      WHERE ge.event_id = e.id AND ge.status = 'approved'
    ) sub
  ) att ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', em.id, 'media_url', em.media_url, 'media_type', em.media_type,
        'display_order', em.display_order, 'aspect_ratio', em.aspect_ratio
      ) ORDER BY em.display_order ASC
    ) AS media
    FROM public.event_media em
    WHERE em.event_id = e.id
  ) med ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS like_count FROM public.event_likes el WHERE el.event_id = e.id
  ) lc ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS save_count FROM public.saved_events se WHERE se.event_id = e.id
  ) sc ON true
  LEFT JOIN public.event_stats es ON es.event_id = e.id
  WHERE e.is_public = true
    AND e.deleted_at IS NULL
    AND (e.is_post = true OR e.start_datetime >= now())
    AND (_cursor IS NULL OR e.created_at < _cursor)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(_limit, 200), 500), 1);
$function$;

import { supabase } from "@/integrations/supabase/client";

export const FOR_YOU_EVENTS_KEY = ["for-you-events"];
export const FOR_YOU_PAGE_SIZE = 20;

const reshape = (data: any[] | null) =>
  (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    description_tags: row.description_tags,
    image_url: row.image_url,
    category: row.category,
    location_name: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    price: row.price,
    has_guestlist: row.has_guestlist,
    has_guestlist_chat: row.has_guestlist_chat,
    max_guestlist_capacity: row.max_guestlist_capacity,
    is_post: row.is_post,
    is_public: row.is_public,
    is_business_event: row.is_business_event,
    show_menu_button: row.show_menu_button,
    show_reservation_button: row.show_reservation_button,
    payment_qr_url: row.payment_qr_url,
    creator_id: row.creator_id,
    created_at: row.created_at,
    creator: {
      id: row.creator_id,
      username: row.creator_username,
      full_name: row.creator_full_name,
      avatar_url: row.creator_avatar_url,
    },
    guestlist_entries: Array.isArray(row.attendee_avatars)
      ? row.attendee_avatars.map((a: any) => ({ user: a }))
      : [],
    _attendee_count: Number(row.attendee_count) || 0,
    media: Array.isArray(row.media) ? row.media : [],
  }));

/**
 * Cursor-paginated For You feed (Instagram/TikTok-style).
 * `cursor` is the `created_at` of the last item from the previous page; first
 * page passes null. Returns the page of rows plus the next cursor (or null
 * when no more pages).
 */
export const fetchForYouEventsPage = async (
  cursor: string | null = null,
  limit: number = FOR_YOU_PAGE_SIZE,
) => {
  const { data, error } = await supabase.rpc("get_for_you_events", {
    _limit: limit,
    _cursor: cursor,
  });
  if (error) throw error;
  const items = reshape(data as any[]);
  const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
};

/** Backwards-compatible: fetch first page only. */
export const fetchForYouEvents = async () => {
  const { items } = await fetchForYouEventsPage(null, FOR_YOU_PAGE_SIZE);
  return items;
};

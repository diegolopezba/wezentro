import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Intent-based prefetch: call on `pointerdown` of an event card so the
 * detail query is already warm by the time navigation resolves (~100-200ms
 * head start). Pinterest/Instagram both prefetch on pointerdown for the same
 * perceived-instant feel. Cheap: react-query dedupes and caches.
 */
export const prefetchEventDetail = (
  queryClient: QueryClient,
  eventId: string,
) => {
  if (!eventId) return;
  queryClient.prefetchQuery({
    queryKey: ["event", eventId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          `*,
          creator:profiles!events_creator_id_fkey(id, username, full_name, avatar_url),
          media:event_media(id, media_url, media_type, display_order, aspect_ratio)`,
        )
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Event not found");
      if (Array.isArray((data as any).media)) {
        (data as any).media.sort(
          (a: any, b: any) => a.display_order - b.display_order,
        );
      }
      return data;
    },
  });
};

export const FOR_YOU_EVENTS_KEY = ["for-you-events"];
export const FOR_YOU_PAGE_SIZE = 20;

// Feature flag: server-assembled slate (Instagram/Pinterest pattern).
// Default ON. Flip to "false" in env to fall back to legacy client ranking.
export const USE_SERVER_SLATE =
  (import.meta.env.VITE_USE_SERVER_SLATE ?? "true") !== "false";

// Per-app-session UUID — gives the server a stable key for the seen-set
// so pagination is dedup'd and order is locked across the whole session.
const SESSION_SEED_KEY = "zentro_feed_session_seed";
export const getSessionSeed = (): string => {
  try {
    let s = sessionStorage.getItem(SESSION_SEED_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_SEED_KEY, s);
    }
    return s;
  } catch {
    return crypto.randomUUID();
  }
};

/** Generate a new session seed (call on pull-to-refresh to get a fresh slate). */
export const resetSessionSeed = (): string => {
  const s = crypto.randomUUID();
  try { sessionStorage.setItem(SESSION_SEED_KEY, s); } catch { /* noop */ }
  return s;
};

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
    _isSponsored: !!row._isSponsored,
    _sponsoredPostId: row._sponsoredPostId ?? null,
    _repostInfo: row._repostInfo ?? undefined,
  }));

/**
 * Cursor-paginated For You feed.
 * When USE_SERVER_SLATE is on, calls `assemble-for-you-slate` which returns
 * a fully-ranked, deduped, ad-injected page. Otherwise falls back to the
 * legacy client-ranked path through `get-for-you-feed` + RPC.
 */
export const fetchForYouEventsPage = async (
  cursor: string | null = null,
  limit: number = FOR_YOU_PAGE_SIZE,
  opts?: { lat?: number | null; lng?: number | null; sessionSeed?: string },
) => {
  if (USE_SERVER_SLATE) {
    try {
      const seed = opts?.sessionSeed ?? getSessionSeed();
      const params = new URLSearchParams({
        limit: String(limit),
        session_seed: seed,
      });
      if (cursor) params.set("cursor", cursor);
      if (opts?.lat != null) params.set("lat", String(opts.lat));
      if (opts?.lng != null) params.set("lng", String(opts.lng));

      // Forward the user's JWT so the edge function can scope context.
      const { data: { session } } = await supabase.auth.getSession();
      const bearer = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assemble-for-you-slate?${params}`;
      const res = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${bearer}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        return {
          items: reshape(json?.items as any[]),
          nextCursor: (json?.next_cursor as string | null) ?? null,
        };
      }
    } catch {
      // fall through to legacy path
    }
  }

  // Legacy fallback: edge-cached first page or direct RPC for cursor pages.
  if (cursor === null) {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-for-you-feed?limit=${limit}`;
      const res = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.items)) {
          const items = reshape(json.items as any[]);
          const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
          return { items, nextCursor };
        }
      }
    } catch { /* noop */ }
  }

  const { data, error } = await supabase.rpc("get_for_you_events", {
    _limit: limit,
    _cursor: cursor,
  });
  if (error) throw error;
  const items = reshape(data as any[]);
  const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
};

export const fetchForYouEvents = async () => {
  const { items } = await fetchForYouEventsPage(null, FOR_YOU_PAGE_SIZE);
  return items;
};

/** Following feed via server-assembled slate. */
export const FOLLOWING_EVENTS_KEY = ["following-events"];
export const fetchFollowingEventsPage = async (
  cursor: string | null = null,
  limit: number = FOR_YOU_PAGE_SIZE,
  opts?: { sessionSeed?: string },
) => {
  const seed = opts?.sessionSeed ?? getSessionSeed();
  const params = new URLSearchParams({ limit: String(limit), session_seed: seed });
  if (cursor) params.set("cursor", cursor);

  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assemble-following-slate?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${bearer}`,
    },
  });
  if (!res.ok) throw new Error(`Following slate fetch failed: ${res.status}`);
  const json = await res.json();
  return {
    items: reshape(json?.items as any[]),
    nextCursor: (json?.next_cursor as string | null) ?? null,
  };
};

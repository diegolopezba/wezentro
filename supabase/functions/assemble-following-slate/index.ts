// Server-assembled "Siguiendo" slate.
// Returns events from people the user follows + reposts by people they follow,
// ranked server-side. Same response shape as assemble-for-you-slate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const recencyScore = (dateStr: string, nowMs: number) => {
  const h = (nowMs - new Date(dateStr).getTime()) / 3.6e6;
  if (h <= 6) return 100;
  if (h <= 24) return 90;
  if (h <= 72) return 70;
  if (h <= 168) return 50;
  if (h <= 336) return 30;
  return 15;
};

const timingScore = (s: string | null, nowMs: number) => {
  if (!s) return 50;
  const h = (new Date(s).getTime() - nowMs) / 3.6e6;
  if (h < 0) return 0;
  if (h <= 24) return 100;
  if (h <= 48) return 90;
  if (h <= 168) return 70;
  if (h <= 672) return 50;
  return 30;
};

const repostScore = (n: number, mutualN: number) => {
  if (n === 0) return 0;
  const base = n >= 3 ? 100 : n === 2 ? 80 : 50;
  return Math.min(120, base + Math.min(mutualN * 20, 40));
};

const creatorRelationScore = (creatorId: string, mutuals: Set<string>, following: Set<string>) => {
  if (!following.has(creatorId)) return 0;
  return mutuals.has(creatorId) ? 120 : 100;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "20")));
    const sessionSeed = url.searchParams.get("session_seed") || crypto.randomUUID();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch { /* ignore */ }
    }

    if (!userId) {
      return new Response(JSON.stringify({ items: [], next_cursor: null, session_id: sessionSeed }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [followingRes, followersRes, seenRes] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", userId),
      supabase.from("follows").select("follower_id").eq("following_id", userId),
      supabase.from("session_feed_state")
        .select("seen_event_ids")
        .eq("session_id", sessionSeed)
        .eq("feed_kind", "following")
        .maybeSingle(),
    ]);

    const followingIds = (followingRes.data || []).map((r: any) => r.following_id);
    const followerIds = new Set((followersRes.data || []).map((r: any) => r.follower_id));
    const followingSet = new Set(followingIds);
    const mutuals = new Set(followingIds.filter((id: string) => followerIds.has(id)));
    const seenIds = new Set<string>((seenRes.data?.seen_event_ids as string[]) || []);

    if (followingIds.length === 0) {
      return new Response(JSON.stringify({ items: [], next_cursor: null, session_id: sessionSeed }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cursorClause = cursor ? `lt.${cursor}` : null;

    // Direct events from followed users + reposts of any event by followed users (parallel).
    let directQuery = supabase
      .from("events")
      .select(`
        id, title, description, description_tags, image_url, category,
        location_name, latitude, longitude, start_datetime, end_datetime,
        price, has_guestlist, has_guestlist_chat, max_guestlist_capacity,
        is_post, is_public, is_business_event, show_menu_button,
        show_reservation_button, payment_qr_url, creator_id, created_at,
        creator:profiles!events_creator_id_fkey(username, full_name, avatar_url)
      `)
      .in("creator_id", followingIds)
      .eq("is_public", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    if (cursor) directQuery = directQuery.lt("created_at", cursor);

    const repostsQuery = supabase
      .from("reposts")
      .select(`
        event_id, created_at, user_id,
        user:profiles!reposts_user_id_fkey(id, username, avatar_url),
        event:events!reposts_event_id_fkey(
          id, title, description, description_tags, image_url, category,
          location_name, latitude, longitude, start_datetime, end_datetime,
          price, has_guestlist, has_guestlist_chat, max_guestlist_capacity,
          is_post, is_public, is_business_event, show_menu_button,
          show_reservation_button, payment_qr_url, creator_id, created_at, deleted_at,
          creator:profiles!events_creator_id_fkey(username, full_name, avatar_url)
        )
      `)
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(limit * 5);

    const [directRes, repostRes] = await Promise.all([directQuery, repostsQuery]);

    const nowMs = Date.now();
    const now = new Date();
    const map = new Map<string, any>();

    for (const e of (directRes.data || []) as any[]) {
      if (seenIds.has(e.id)) continue;
      if (e.start_datetime && new Date(e.start_datetime) < now) continue;
      map.set(e.id, { ...e, _repostInfo: null });
    }

    const repostsByEvent = new Map<string, any[]>();
    for (const r of (repostRes.data || []) as any[]) {
      if (!r.event || r.event.deleted_at || !r.event.is_public) continue;
      if (r.event.start_datetime && new Date(r.event.start_datetime) < now) continue;
      if (seenIds.has(r.event_id)) continue;
      const arr = repostsByEvent.get(r.event_id) || [];
      arr.push(r);
      repostsByEvent.set(r.event_id, arr);
    }

    for (const [eventId, reposts] of repostsByEvent.entries()) {
      const repostInfo = {
        repostedBy: reposts.map((r: any) => r.user).filter(Boolean),
        totalRepostsByFollowing: reposts.length,
        mostRecentRepostAt: reposts[0]?.created_at || "",
      };
      const existing = map.get(eventId);
      if (existing) {
        existing._repostInfo = repostInfo;
      } else {
        const ev = reposts[0].event;
        delete ev.deleted_at;
        map.set(eventId, { ...ev, _repostInfo: repostInfo });
      }
    }

    const scored = Array.from(map.values())
      .map((e: any) => {
        const recencyDate = e._repostInfo?.mostRecentRepostAt || e.created_at;
        const repostCount = e._repostInfo?.totalRepostsByFollowing || 0;
        const mutualRepostCount = (e._repostInfo?.repostedBy || []).filter((u: any) => mutuals.has(u.id)).length;
        const score =
          creatorRelationScore(e.creator_id, mutuals as Set<string>, followingSet) * 0.35 +
          recencyScore(recencyDate, nowMs) * 0.25 +
          timingScore(e.start_datetime, nowMs) * 0.10 +
          repostScore(repostCount, mutualRepostCount) * 0.20;
        return { ...e, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    // Hydrate to common response shape.
    const items = scored.map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      description_tags: e.description_tags,
      image_url: e.image_url,
      category: e.category,
      location_name: e.location_name,
      latitude: e.latitude,
      longitude: e.longitude,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      price: e.price,
      has_guestlist: e.has_guestlist,
      has_guestlist_chat: e.has_guestlist_chat,
      max_guestlist_capacity: e.max_guestlist_capacity,
      is_post: e.is_post,
      is_public: e.is_public,
      is_business_event: e.is_business_event,
      show_menu_button: e.show_menu_button,
      show_reservation_button: e.show_reservation_button,
      payment_qr_url: e.payment_qr_url,
      creator_id: e.creator_id,
      created_at: e.created_at,
      creator_username: e.creator?.username,
      creator_full_name: e.creator?.full_name,
      creator_avatar_url: e.creator?.avatar_url,
      attendee_count: 0,
      attendee_avatars: [],
      media: [],
      _repostInfo: e._repostInfo,
    }));

    const newSeen = [...seenIds, ...items.map((m) => m.id)];
    const capped = newSeen.slice(Math.max(0, newSeen.length - 500));
    await supabase.from("session_feed_state").upsert(
      {
        session_id: sessionSeed,
        user_id: userId,
        seen_event_ids: capped,
        feed_kind: "following",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,feed_kind" },
    );

    const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;

    return new Response(
      JSON.stringify({ items, next_cursor: nextCursor, session_id: sessionSeed }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

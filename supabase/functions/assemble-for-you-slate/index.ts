// Server-assembled "Para Ti" slate (Instagram/Pinterest pattern).
// Returns a fully-ranked, deduped, ad-injected page so the client never
// has to re-rank. Same algorithm as src/lib/feedScoring.ts (V6) ported to Deno.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ──────────────── scoring (ported from src/lib/feedScoring.ts V6) ────────────────

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const proximityScore = (eLat: number | null, eLon: number | null, uLat: number | null, uLon: number | null) => {
  if (!eLat || !eLon || !uLat || !uLon) return 50;
  const d = haversine(uLat, uLon, eLat, eLon);
  if (d <= 1.6) return 100;
  if (d <= 8) return 80;
  if (d <= 16) return 60;
  if (d <= 40) return 40;
  if (d <= 80) return 20;
  return 10;
};

const popularityScore = (n: number) =>
  n >= 50 ? 100 : n >= 25 ? 80 : n >= 10 ? 60 : n >= 5 ? 40 : n >= 1 ? 20 : 10;

const interestScore = (cat: string | null, interests: string[] | null) => {
  if (!interests?.length) return 50;
  if (!cat) return 20;
  const c = cat.toLowerCase();
  const n = interests.map((i) => i.toLowerCase());
  if (n.includes(c)) return 100;
  if (n.some((i) => c.includes(i) || i.includes(c))) return 70;
  return 20;
};

const recencyScore = (createdAt: string, nowMs: number) => {
  const h = (nowMs - new Date(createdAt).getTime()) / 3.6e6;
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
  if (h <= 48) return 80;
  if (h <= 168) return 60;
  if (h <= 720) return 40;
  return 20;
};

const friendsScore = (entries: any[], following: string[], mutuals: Set<string>) => {
  if (!following.length) return 50;
  if (!entries?.length) return 10;
  let w = 0;
  for (const e of entries) {
    const id = e?.id || e?.user?.id;
    if (!id) continue;
    if (mutuals.has(id)) w += 2;
    else if (following.includes(id)) w += 1;
  }
  if (w >= 8) return 100;
  if (w >= 5) return 80;
  if (w >= 3) return 60;
  if (w >= 1) return 40;
  return 10;
};

const learnedScore = (cat: string | null, creatorId: string, catPrefs: Record<string, number>, creatorPrefs: Record<string, number>) => {
  if (!Object.keys(catPrefs).length && !Object.keys(creatorPrefs).length) return 50;
  let s = 50;
  if (cat) {
    const v = catPrefs[cat.toLowerCase()] ?? catPrefs[cat];
    if (v) s += (v / 100) * 30;
  }
  const cs = creatorPrefs[creatorId];
  if (cs) s += (cs / 100) * 20;
  return Math.min(100, s);
};

const trendingScore = (w: number) =>
  w >= 50 ? 100 : w >= 25 ? 85 : w >= 12 ? 70 : w >= 5 ? 50 : w >= 2 ? 30 : w >= 1 ? 15 : 0;

const velocityScore = (v: number) =>
  v >= 10 ? 100 : v >= 6 ? 85 : v >= 3 ? 65 : v >= 1 ? 40 : 0;

const TIME_MAP: Record<string, string[]> = {
  morning: ["brunch", "fitness", "wellness", "networking", "yoga", "café", "cafe", "desayuno", "culture"],
  afternoon: ["shopping", "culture", "food", "sports", "arte", "museo", "deporte", "comida"],
  evening: ["dinner", "drinks", "music", "concerts", "cena", "concierto", "música", "happy hour", "culture"],
  night: ["nightlife", "party", "bar", "fiesta", "dj", "noche", "antro", "rave"],
};

const timeOfDayScore = (cat: string | null, nowMs: number) => {
  if (!cat) return 50;
  const h = new Date(nowMs).getHours();
  const p = h >= 6 && h < 11 ? "morning" : h >= 11 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night";
  const rel = TIME_MAP[p] || [];
  const c = cat.toLowerCase();
  return rel.some((r) => c.includes(r) || r.includes(c)) ? 100 : 40;
};

const creatorLoyaltyScore = (creatorId: string, attendance: Record<string, number>) => {
  const c = attendance[creatorId] || 0;
  return c >= 3 ? 100 : c === 2 ? 70 : c === 1 ? 40 : 0;
};

const dayOfWeekScore = (cat: string | null, prefs: Record<string, number>) => {
  if (!cat || !Object.keys(prefs).length) return 50;
  const s = prefs[cat.toLowerCase()] ?? prefs[cat];
  return s != null ? Math.min(100, s) : 30;
};

const descTagScore = (tags: string[] | null, prefs: Record<string, number>) => {
  if (!tags?.length || !Object.keys(prefs).length) return 50;
  let total = 0, n = 0;
  for (const t of tags) {
    const s = prefs[t];
    if (s != null) { total += s; n++; }
  }
  if (n === 0) return 30;
  return Math.min(100, total / n + Math.min(20, n * 5));
};

const collabScore = (eventId: string, boosts: Record<string, number>) => {
  const b = boosts[eventId];
  if (!b) return 0;
  return b >= 4 ? 100 : b >= 3 ? 80 : b >= 2 ? 60 : b >= 1 ? 40 : 0;
};

const socialProofScore = (entries: any[], mutuals: Set<string>) => {
  if (!mutuals.size || !entries?.length) return 0;
  let n = 0;
  for (const e of entries) {
    const id = e?.id || e?.user?.id;
    if (id && mutuals.has(id)) n++;
  }
  return n >= 4 ? 100 : n >= 3 ? 80 : n >= 2 ? 60 : n >= 1 ? 40 : 0;
};

const calculateScore = (event: any, ctx: any, nowMs: number): number => {
  const entries = event.attendee_avatars || [];
  const isPost = !!event.is_post;
  const mutuals: Set<string> = ctx._mutualSet;

  const proximity = proximityScore(event.latitude, event.longitude, ctx.userLat, ctx.userLon);
  const friends = friendsScore(entries, ctx.followingIds, mutuals);
  const trending = trendingScore(ctx.trendingCounts[event.id] || 0);
  const learned = learnedScore(event.category, event.creator_id, ctx.categoryPrefs, ctx.creatorPrefs);
  const recency = recencyScore(event.created_at, nowMs);
  const timeOfDay = timeOfDayScore(event.category, nowMs);
  const timing = timingScore(event.start_datetime, nowMs);
  const creatorLoyalty = creatorLoyaltyScore(event.creator_id, ctx.creatorAttendance);
  const dayOfWeek = dayOfWeekScore(event.category, ctx.dayOfWeekPrefs);
  const descTags = descTagScore(event.description_tags || null, ctx.tagPrefs);
  const collab = collabScore(event.id, ctx.collabBoosts);
  const socialProof = socialProofScore(entries, mutuals);
  const velocity = velocityScore(ctx.velocityCounts[event.id] || 0);

  const hasLearned = Object.keys(ctx.categoryPrefs).length > 0 || Object.keys(ctx.creatorPrefs).length > 0;
  const interestRaw = interestScore(event.category, ctx.userInterests);
  const interest = ctx.isNewUser || !hasLearned ? Math.min(100, interestRaw * 1.4) : interestRaw;

  if (isPost) {
    return (
      recency * 0.30 + friends * 0.14 + trending * 0.12 + learned * 0.10 +
      interest * 0.10 + descTags * 0.08 + velocity * 0.06 +
      collab * 0.06 + socialProof * 0.02 + proximity * 0.02
    );
  }
  return (
    friends * 0.14 + proximity * 0.12 + learned * 0.08 + interest * 0.08 +
    trending * 0.09 + creatorLoyalty * 0.07 + descTags * 0.07 + collab * 0.06 +
    recency * 0.06 + popularityScore(entries.length) * 0.07 +
    timeOfDay * 0.05 + dayOfWeek * 0.05 + socialProof * 0.03 + timing * 0.03
  );
};

// ──────────────── handler ────────────────

const SPONSORED_SLOTS = [1, 9, 19]; // positions within each returned page

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "20")));
    const sessionSeed = url.searchParams.get("session_seed") || crypto.randomUUID();
    const lat = url.searchParams.get("lat") ? Number(url.searchParams.get("lat")) : null;
    const lng = url.searchParams.get("lng") ? Number(url.searchParams.get("lng")) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Extract user id from JWT if present (no signature check needed —
    // service-role client doesn't enforce RLS, we just use it for context).
    let userId: string | null = null;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch { /* ignore */ }
    }

    // Overfetch candidates for ranking headroom.
    const candidatesPromise = supabase.rpc("get_for_you_events", {
      _limit: limit * 3,
      _cursor: cursor,
    });

    // Pull context in parallel.
    const contextPromise = userId
      ? supabase.rpc("get_for_you_context", { _user_id: userId })
      : Promise.resolve({ data: {} as any, error: null });
    const trendingPromise = supabase.rpc("get_trending_scores");
    const collabPromise = userId
      ? (async () => {
          // fire-and-forget refresh, then read cache
          supabase.rpc("ensure_collab_boosts_fresh", { _user_id: userId }).then(() => {});
          return supabase.rpc("get_collab_boosts", { _user_id: userId });
        })()
      : Promise.resolve({ data: [], error: null });
    const sponsoredPromise = supabase.rpc("get_eligible_sponsored_posts", {
      _user_id: userId,
      _lat: lat,
      _lng: lng,
    });
    const prefsPromise = userId
      ? supabase.from("user_category_preferences").select("category, score").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null });
    const creatorPrefsPromise = userId
      ? supabase.from("user_creator_preferences").select("creator_id, score").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null });

    // Session seen-set
    const seenPromise = supabase
      .from("session_feed_state")
      .select("seen_event_ids")
      .eq("session_id", sessionSeed)
      .eq("feed_kind", "for_you")
      .maybeSingle();

    const [candidatesRes, contextRes, trendingRes, collabRes, sponsoredRes, prefsRes, creatorPrefsRes, seenRes] =
      await Promise.all([
        candidatesPromise, contextPromise, trendingPromise, collabPromise,
        sponsoredPromise, prefsPromise, creatorPrefsPromise, seenPromise,
      ]);

    if (candidatesRes.error) throw candidatesRes.error;

    const ctxData = (contextRes.data as any) || {};
    const trendingCounts: Record<string, number> = {};
    const velocityCounts: Record<string, number> = {};
    for (const row of (trendingRes.data || []) as any[]) {
      trendingCounts[row.event_id] = Number(row.trending_score) || 0;
      velocityCounts[row.event_id] = Number(row.velocity_count) || 0;
    }
    const collabBoosts: Record<string, number> = {};
    for (const row of (collabRes.data || []) as any[]) {
      if (row.event_id !== "00000000-0000-0000-0000-000000000000") {
        collabBoosts[row.event_id] = Number(row.boost_count) || 0;
      }
    }
    const categoryPrefs: Record<string, number> = {};
    for (const row of (prefsRes.data || []) as any[]) categoryPrefs[row.category] = Number(row.score) || 0;
    const creatorPrefs: Record<string, number> = {};
    for (const row of (creatorPrefsRes.data || []) as any[]) creatorPrefs[row.creator_id] = Number(row.score) || 0;

    const mutualSet = new Set<string>((ctxData.mutual_follower_ids as string[]) || []);
    const seenIds = new Set<string>((seenRes.data?.seen_event_ids as string[]) || []);

    const isNewUser = !userId ||
      (Object.keys(categoryPrefs).length === 0 && Object.keys(creatorPrefs).length === 0);

    const ctx = {
      userLat: lat,
      userLon: lng,
      userInterests: (ctxData.interests as string[]) || null,
      followingIds: (ctxData.following_ids as string[]) || [],
      categoryPrefs,
      creatorPrefs,
      trendingCounts,
      velocityCounts,
      creatorAttendance: (ctxData.creator_attendance as Record<string, number>) || {},
      dayOfWeekPrefs: (ctxData.day_of_week_prefs as Record<string, number>) || {},
      tagPrefs: (ctxData.tag_prefs as Record<string, number>) || {},
      collabBoosts,
      isNewUser,
      _mutualSet: mutualSet,
    };

    const nowMs = Date.now();
    const sponsoredEventIds = new Set<string>(((sponsoredRes.data || []) as any[]).map((s) => s.event_id));

    const candidates = ((candidatesRes.data || []) as any[])
      .filter((e) => !seenIds.has(e.id))
      .filter((e) => !sponsoredEventIds.has(e.id)) // never duplicate ad event in organic
      .map((e) => ({ ...e, _score: calculateScore(e, ctx, nowMs) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    // Hydrate sponsored cards: fetch their event payloads via the same shape.
    const sponsoredItems: any[] = [];
    if ((sponsoredRes.data || []).length > 0) {
      const idsToHydrate = ((sponsoredRes.data || []) as any[]).slice(0, SPONSORED_SLOTS.length).map((s) => s.event_id);
      if (idsToHydrate.length > 0) {
        const { data: spEvents } = await supabase
          .from("events")
          .select(`
            id, title, description, description_tags, image_url, category,
            location_name, latitude, longitude, start_datetime, end_datetime,
            price, has_guestlist, has_guestlist_chat, max_guestlist_capacity,
            is_post, is_public, is_business_event, show_menu_button,
            show_reservation_button, payment_qr_url, creator_id, created_at,
            creator:profiles!events_creator_id_fkey(username, full_name, avatar_url)
          `)
          .in("id", idsToHydrate)
          .is("deleted_at", null);

        for (const sp of (sponsoredRes.data || []) as any[]) {
          const ev = (spEvents || []).find((e: any) => e.id === sp.event_id);
          if (!ev) continue;
          sponsoredItems.push({
            ...ev,
            creator_username: ev.creator?.username,
            creator_full_name: ev.creator?.full_name,
            creator_avatar_url: ev.creator?.avatar_url,
            attendee_count: 0,
            attendee_avatars: [],
            media: [],
            _isSponsored: true,
            _sponsoredPostId: sp.sponsored_post_id,
          });
        }
      }
    }

    // Inject sponsored at fixed slots within this page.
    const merged: any[] = [];
    let oi = 0, si = 0;
    for (let i = 0; merged.length < candidates.length + sponsoredItems.length; i++) {
      if (SPONSORED_SLOTS.includes(i) && si < sponsoredItems.length) {
        merged.push(sponsoredItems[si++]);
      } else if (oi < candidates.length) {
        merged.push(candidates[oi++]);
      } else if (si < sponsoredItems.length) {
        merged.push(sponsoredItems[si++]);
      } else break;
    }

    // Persist new seen-set (capped at 500, FIFO).
    const newSeen = [...seenIds, ...merged.map((m) => m.id)];
    const capped = newSeen.slice(Math.max(0, newSeen.length - 500));
    if (userId !== null || true) {
      // upsert keyed on (session_id, feed_kind)
      await supabase
        .from("session_feed_state")
        .upsert(
          {
            session_id: sessionSeed,
            user_id: userId,
            seen_event_ids: capped,
            feed_kind: "for_you",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id,feed_kind" },
        );
    }

    const nextCursor = candidates.length === limit
      ? candidates[candidates.length - 1].created_at
      : null;

    return new Response(
      JSON.stringify({ items: merged, next_cursor: nextCursor, session_id: sessionSeed }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": userId ? "private, no-store" : "public, s-maxage=30, stale-while-revalidate=120",
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

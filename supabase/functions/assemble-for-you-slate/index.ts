// Server-assembled "Para Ti" slate (Pinterest/Instagram pattern).
//
// Contract:
//   - Cursor is opaque, base64url({seed, page}).
//   - Same cursor → same response, byte-for-byte. No mutable server-side
//     "seen-set" feeds into the serving path → no self-poisoning on
//     duplicate/refetched first-page calls.
//   - Ranking is deterministic given a (userId, seed): stable score + id tiebreak.
//   - Recirculation: page 0 is NEVER empty if the database has any events.
//   - session_feed_state is no longer touched by serving.

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

// V7: engagement-rate score (per impression). The "good content rises" rule.
const engagementScore = (
  likes: number, saves: number, joins: number, impressions: number
): number => {
  const weighted = likes + 2 * saves + 3 * joins;
  if (weighted <= 0) return 0;
  const ratio = weighted / Math.max(impressions, 20);
  if (ratio >= 0.30) return 100;
  if (ratio >= 0.20) return 85;
  if (ratio >= 0.10) return 70;
  if (ratio >= 0.05) return 55;
  if (ratio >= 0.02) return 35;
  if (ratio >= 0.01) return 20;
  return 10;
};

// V7: multiplicative quality penalty. The "dead content sinks" rule.
const qualityMultiplier = (
  likes: number, saves: number, joins: number, impressions: number,
  createdAt: string, nowMs: number
): number => {
  const ageH = (nowMs - new Date(createdAt).getTime()) / 3.6e6;
  if (ageH < 6 && impressions < 20) return 1.0; // cold-start exemption
  const totalEng = likes + saves + joins;
  if (impressions >= 50 && totalEng === 0) return 0.55;
  if (impressions >= 100) {
    const ratio = (likes + 2 * saves + 3 * joins) / Math.max(impressions, 1);
    if (ratio < 0.01) return 0.7;
  }
  return 1.0;
};

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

// Tiny deterministic hash → [0,1). Used as a stable per-seed jitter so
// different sessions get different orderings without random() shuffling.
const hashJitter = (seed: string, id: string): number => {
  let h = 2166136261;
  const s = seed + ":" + id;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

const calculateScore = (event: any, ctx: any, nowMs: number): number => {
  const entries = event.attendee_avatars || [];
  const isPost = !!event.is_post;
  const mutuals: Set<string> = ctx._mutualSet;

  const likes = Number(event.like_count) || 0;
  const saves = Number(event.save_count) || 0;
  const joins = Number(event.attendee_count) || entries.length || 0;
  const impressions = Number(event.impression_count) || 0;

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
  const engagement = engagementScore(likes, saves, joins, impressions);

  const hasLearned = Object.keys(ctx.categoryPrefs).length > 0 || Object.keys(ctx.creatorPrefs).length > 0;
  const interestRaw = interestScore(event.category, ctx.userInterests);
  const interest = ctx.isNewUser || !hasLearned ? Math.min(100, interestRaw * 1.4) : interestRaw;

  // V7 weights — quality dominates, recency demoted.
  let base: number;
  if (isPost) {
    base =
      trending      * 0.22 +
      engagement    * 0.12 +
      recency       * 0.14 +
      friends       * 0.12 +
      learned       * 0.08 +
      interest      * 0.08 +
      velocity      * 0.08 +
      descTags      * 0.06 +
      collab        * 0.05 +
      socialProof   * 0.03 +
      proximity     * 0.02;
  } else {
    base =
      trending             * 0.14 +
      friends              * 0.12 +
      proximity            * 0.10 +
      popularityScore(joins) * 0.10 +
      engagement           * 0.08 +
      learned              * 0.07 +
      interest             * 0.07 +
      creatorLoyalty       * 0.06 +
      descTags             * 0.05 +
      collab               * 0.05 +
      recency              * 0.05 +
      timeOfDay            * 0.04 +
      dayOfWeek            * 0.03 +
      socialProof          * 0.02 +
      timing               * 0.02;
  }

  // V7: multiplicative quality penalty for dead content.
  const qm = qualityMultiplier(likes, saves, joins, impressions, event.created_at, nowMs);

  // Premium plan: gentle discovery priority for Premium businesses. Only when
  // quality is untouched (qm === 1), so a paid plan can never lift dead content.
  const premiumBoost =
    qm === 1 && ctx.premiumBusinessIds?.has(event.creator_id) ? 1.08 : 1;

  // Tiny per-seed jitter (<2 pts) for stable per-session tiebreaks.
  return base * qm * premiumBoost + hashJitter(ctx.sessionSeed, event.id) * 2;
};

// ──────────────── cursor codec ────────────────

type Cursor = { seed: string; page: number };

const encodeCursor = (c: Cursor): string => {
  const json = JSON.stringify(c);
  // base64url
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const decodeCursor = (raw: string | null, fallbackSeed: string): Cursor => {
  if (!raw) return { seed: fallbackSeed, page: 0 };
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    if (typeof parsed?.seed === "string" && Number.isInteger(parsed?.page) && parsed.page >= 0) {
      return { seed: parsed.seed, page: parsed.page };
    }
  } catch { /* fall through */ }
  return { seed: fallbackSeed, page: 0 };
};

// ──────────────── handler ────────────────

const SPONSORED_SLOTS = [1, 9, 19];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const rawCursor = url.searchParams.get("cursor");
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "20")));
    const sessionSeed = url.searchParams.get("session_seed") || crypto.randomUUID();
    const lat = url.searchParams.get("lat") ? Number(url.searchParams.get("lat")) : null;
    const lng = url.searchParams.get("lng") ? Number(url.searchParams.get("lng")) : null;

    const cursor = decodeCursor(rawCursor, sessionSeed);
    const seed = cursor.seed;
    const page = cursor.page;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch { /* ignore */ }
    }

    // Pull the FULL candidate pool. Pass explicit args to resolve the
    // overloaded RPC (two get_for_you_events overloads exist).
    const candidatesPromise = supabase.rpc("get_for_you_events", {
      _limit: 200,
      _cursor: null,
    });

    const contextPromise = userId
      ? supabase.rpc("get_for_you_context", { _user_id: userId })
      : Promise.resolve({ data: {} as any, error: null });
    const trendingPromise = supabase.rpc("get_trending_scores");
    const premiumPromise = getPremiumBusinessIds(supabase);
    const collabPromise = userId
      ? (async () => {
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

    const [candidatesRes, contextRes, trendingRes, collabRes, sponsoredRes, prefsRes, creatorPrefsRes, premiumBusinessIds] =
      await Promise.all([
        candidatesPromise, contextPromise, trendingPromise, collabPromise,
        sponsoredPromise, prefsPromise, creatorPrefsPromise, premiumPromise,
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
      sessionSeed: seed,
      _mutualSet: mutualSet,
    };

    const nowMs = Date.now();
    const sponsoredEventIds = new Set<string>(((sponsoredRes.data || []) as any[]).map((s) => s.event_id));
    const allCandidates = (candidatesRes.data || []) as any[];

    // Rank the FULL pool deterministically (score DESC, id ASC tiebreak).
    const sorted = allCandidates
      .filter((e) => !sponsoredEventIds.has(e.id))
      .map((e) => ({ ...e, _score: calculateScore(e, ctx, nowMs) }))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

    // V7: Creator de-duplication — prevent the same creator from occupying
    // consecutive slots (Pinterest/IG style). Push offenders down a few spots.
    const ranked: any[] = [];
    const pending = [...sorted];
    while (pending.length > 0) {
      let pickedIdx = 0;
      for (let i = 0; i < pending.length; i++) {
        const cid = pending[i].creator_id;
        const last1 = ranked[ranked.length - 1]?.creator_id;
        const last2 = ranked[ranked.length - 2]?.creator_id;
        if (cid !== last1 || cid !== last2) { pickedIdx = i; break; }
        // Otherwise keep looking; if we exhaust, fall back to the head.
      }
      ranked.push(pending.splice(pickedIdx, 1)[0]);
    }


    // Slice by page.
    const offset = page * limit;
    let pageCandidates = ranked.slice(offset, offset + limit);

    // Recirculation: if page 0 came back empty (rare — implies zero events
    // exist in the visible pool), serve the raw pool ordered by recency so
    // the home feed is never blank.
    if (page === 0 && pageCandidates.length === 0 && allCandidates.length > 0) {
      pageCandidates = [...allCandidates]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }

    // Hydrate sponsored items only for page 0 (ads live in the first page slots).
    const sponsoredItems: any[] = [];
    if (page === 0 && (sponsoredRes.data || []).length > 0) {
      const idsToHydrate = ((sponsoredRes.data || []) as any[])
        .slice(0, SPONSORED_SLOTS.length)
        .map((s) => s.event_id);
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
    for (let i = 0; merged.length < pageCandidates.length + sponsoredItems.length; i++) {
      if (SPONSORED_SLOTS.includes(i) && si < sponsoredItems.length) {
        merged.push(sponsoredItems[si++]);
      } else if (oi < pageCandidates.length) {
        merged.push(pageCandidates[oi++]);
      } else if (si < sponsoredItems.length) {
        merged.push(sponsoredItems[si++]);
      } else break;
    }

    // nextCursor: null only when the next slice would be empty.
    const hasMore = ranked.length > offset + limit;
    const nextCursor = hasMore ? encodeCursor({ seed, page: page + 1 }) : null;

    return new Response(
      JSON.stringify({ items: merged, next_cursor: nextCursor, session_id: seed }),
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

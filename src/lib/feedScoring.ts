/**
 * Feed Scoring Engine — Algorithm V6 "Viral Mechanics"
 *
 * V6 changes:
 *  - Posts and events use SEPARATE weight distributions
 *  - New velocity signal for posts (TikTok-style early-engagement boost)
 *  - Quality-weighted trending (join/save=5, like/repost=3, click=1, views excluded)
 *  - Cold-start boost: new users get interest weight amplified to 0.25
 *  - Repost recency uses mostRecentRepostAt instead of original created_at
 *
 * POST weights (virality-first):
 *   recency      30%  freshness is the primary signal
 *   friends      14%
 *   trending     12%  velocity-weighted
 *   learned      10%
 *   interest     10%
 *   tags          8%
 *   velocity      6%  NEW — 2-hour high-intent engagement burst
 *   collaborative 6%
 *   socialProof   2%
 *   proximity     2%
 *
 * EVENT weights (location + timing-first):
 *   friends      14%
 *   proximity    12%
 *   trending      9%
 *   creatorLoyalty 7%
 *   learned       8%
 *   interest      8%
 *   tags          7%
 *   collaborative 6%
 *   recency       6%
 *   popularity    7%
 *   timeOfDay     5%
 *   dayOfWeek     5%
 *   socialProof   3%
 *   timing        3%
 */

// ───────── helpers ─────────

export const haversine = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ───────── individual scores (0-100) ─────────

export const getProximityScore = (
  eventLat: number | null, eventLon: number | null,
  userLat: number | null, userLon: number | null
): number => {
  if (!eventLat || !eventLon || !userLat || !userLon) return 50;
  const d = haversine(userLat, userLon, eventLat, eventLon);
  if (d <= 1.6) return 100;
  if (d <= 8) return 80;
  if (d <= 16) return 60;
  if (d <= 40) return 40;
  if (d <= 80) return 20;
  return 10;
};

export const getPopularityScore = (attendees: number): number => {
  if (attendees >= 50) return 100;
  if (attendees >= 25) return 80;
  if (attendees >= 10) return 60;
  if (attendees >= 5) return 40;
  if (attendees >= 1) return 20;
  return 10;
};

export const getInterestScore = (
  category: string | null, interests: string[] | null
): number => {
  if (!interests?.length) return 50;
  if (!category) return 20;
  const cat = category.toLowerCase();
  const norms = interests.map((i) => i.toLowerCase());
  if (norms.includes(cat)) return 100;
  if (norms.some((i) => cat.includes(i) || i.includes(cat))) return 70;
  return 20;
};

export const getRecencyScore = (createdAt: string, nowMs: number = Date.now()): number => {
  const h = (nowMs - new Date(createdAt).getTime()) / 3.6e6;
  if (h <= 6) return 100;   // V6: extra boost for very fresh content
  if (h <= 24) return 90;
  if (h <= 72) return 70;
  if (h <= 168) return 50;
  if (h <= 336) return 30;
  return 15;
};

export const getTimingScore = (startDatetime: string | null, nowMs: number = Date.now()): number => {
  if (!startDatetime) return 50;
  const h = (new Date(startDatetime).getTime() - nowMs) / 3.6e6;
  if (h < 0) return 0;
  if (h <= 24) return 100;
  if (h <= 48) return 80;
  if (h <= 168) return 60;
  if (h <= 720) return 40;
  return 20;
};

export const getFriendsGoingScore = (
  guestEntries: { user: { id: string } }[] | undefined,
  followingIds: string[] | null,
  mutualFollowerIds?: string[] | null
): number => {
  if (!followingIds?.length) return 50;
  if (!guestEntries?.length) return 10;
  const ids = guestEntries.map((e) => e.user?.id).filter(Boolean);
  const mutualSet = new Set(mutualFollowerIds || []);

  let weightedCount = 0;
  for (const id of ids) {
    if (mutualSet.has(id)) {
      weightedCount += 2;
    } else if (followingIds.includes(id)) {
      weightedCount += 1;
    }
  }

  if (weightedCount >= 8) return 100;
  if (weightedCount >= 5) return 80;
  if (weightedCount >= 3) return 60;
  if (weightedCount >= 1) return 40;
  return 10;
};

export const getLearnedPreferenceScore = (
  category: string | null,
  creatorId: string,
  catPrefs: Record<string, number>,
  creatorPrefs: Record<string, number>
): number => {
  if (!Object.keys(catPrefs).length && !Object.keys(creatorPrefs).length) return 50;
  let score = 50;
  if (category) {
    const s = catPrefs[category.toLowerCase()] ?? catPrefs[category];
    if (s) score += (s / 100) * 30;
  }
  const cs = creatorPrefs[creatorId];
  if (cs) score += (cs / 100) * 20;
  return Math.min(100, score);
};

/**
 * V6: Quality-weighted trending score.
 * Uses weighted counts (join/save=5, like/repost=3, click=1) instead of raw counts.
 * This mirrors Instagram/TikTok where passive views don't count as engagement.
 */
export const getTrendingScore = (weightedCount: number): number => {
  if (weightedCount >= 50) return 100;
  if (weightedCount >= 25) return 85;
  if (weightedCount >= 12) return 70;
  if (weightedCount >= 5) return 50;
  if (weightedCount >= 2) return 30;
  if (weightedCount >= 1) return 15;
  return 0;
};

/**
 * V6 NEW: Velocity score — TikTok-style early engagement burst detection.
 * Measures high-intent interactions in the last 2 hours.
 * A post/event gaining rapid early traction gets a large boost.
 */
export const getVelocityScore = (
  eventId: string,
  velocityCounts: Record<string, number>
): number => {
  const v = velocityCounts[eventId] || 0;
  if (v >= 10) return 100;
  if (v >= 6) return 85;
  if (v >= 3) return 65;
  if (v >= 1) return 40;
  return 0;
};

/**
 * V7: Engagement-rate score. Rewards content with strong like/save/join ratio
 * per impression. The "good content rises" rule used by TikTok/IG/Pinterest.
 */
export const getEngagementScore = (
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

/**
 * V7: Multiplicative quality penalty. The "dead content sinks" rule —
 * demote items shown many times with no engagement.
 */
export const getQualityMultiplier = (
  likes: number, saves: number, joins: number, impressions: number,
  createdAt: string, nowMs: number = Date.now()
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

const TIME_CATEGORY_MAP: Record<string, string[]> = {
  morning:   ["brunch", "fitness", "wellness", "networking", "yoga", "café", "cafe", "desayuno", "culture"],
  afternoon: ["shopping", "culture", "food", "sports", "arte", "museo", "deporte", "comida"],
  evening:   ["dinner", "drinks", "music", "concerts", "cena", "concierto", "música", "happy hour", "culture"],
  night:     ["nightlife", "party", "bar", "fiesta", "dj", "noche", "antro", "rave"],
};

const getTimePeriod = (hour: number): string => {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

export const getTimeOfDayScore = (category: string | null, nowMs: number = Date.now()): number => {
  if (!category) return 50;
  const period = getTimePeriod(new Date(nowMs).getHours());
  const relevantCats = TIME_CATEGORY_MAP[period] || [];
  const cat = category.toLowerCase();
  if (relevantCats.some((c) => cat.includes(c) || c.includes(cat))) return 100;
  return 40;
};

export const getCreatorLoyaltyScore = (
  creatorId: string,
  creatorAttendance: Record<string, number>
): number => {
  const count = creatorAttendance[creatorId] || 0;
  if (count >= 3) return 100;
  if (count === 2) return 70;
  if (count === 1) return 40;
  return 0;
};

export const getDayOfWeekScore = (
  category: string | null,
  dayPrefs: Record<string, number>
): number => {
  if (!category || !Object.keys(dayPrefs).length) return 50;
  const score = dayPrefs[category.toLowerCase()] ?? dayPrefs[category];
  if (score != null) return Math.min(100, score);
  return 30;
};

export const getDescriptionTagScore = (
  eventTags: string[] | null,
  tagPrefs: Record<string, number>
): number => {
  if (!eventTags?.length || !Object.keys(tagPrefs).length) return 50;
  let totalScore = 0;
  let matchCount = 0;
  for (const tag of eventTags) {
    const prefScore = tagPrefs[tag];
    if (prefScore != null) {
      totalScore += prefScore;
      matchCount++;
    }
  }
  if (matchCount === 0) return 30;
  const avgScore = totalScore / matchCount;
  const matchBonus = Math.min(20, matchCount * 5);
  return Math.min(100, avgScore + matchBonus);
};

export const getCollaborativeScore = (
  eventId: string,
  collaborativeBoosts: Record<string, number>
): number => {
  const boost = collaborativeBoosts[eventId];
  if (!boost) return 0;
  if (boost >= 4) return 100;
  if (boost >= 3) return 80;
  if (boost >= 2) return 60;
  if (boost >= 1) return 40;
  return 0;
};

export const getSocialProofScore = (
  guestEntries: { user: { id: string } }[] | undefined,
  mutualFollowerIds: string[] | null
): number => {
  if (!mutualFollowerIds?.length || !guestEntries?.length) return 0;
  const ids = guestEntries.map((e) => e.user?.id).filter(Boolean);
  const mutualSet = new Set(mutualFollowerIds);
  const mutualCount = ids.filter((id) => mutualSet.has(id)).length;
  if (mutualCount >= 4) return 100;
  if (mutualCount >= 3) return 80;
  if (mutualCount >= 2) return 60;
  if (mutualCount >= 1) return 40;
  return 0;
};

// ───────── composite score ─────────

export interface ScoringContext {
  userLat: number | null;
  userLon: number | null;
  userInterests: string[] | null;
  followingIds: string[] | null;
  categoryPrefs: Record<string, number>;
  creatorPrefs: Record<string, number>;
  /** V6: quality-weighted trending counts */
  trendingCounts: Record<string, number>;
  creatorAttendance: Record<string, number>;
  dayOfWeekPrefs: Record<string, number>;
  tagPrefs: Record<string, number>;
  collaborativeBoosts: Record<string, number>;
  mutualFollowerIds: string[] | null;
  /** V6: 2-hour high-intent interaction counts per event */
  velocityCounts: Record<string, number>;
  /** V6: true when user has no learned preferences yet (cold start) */
  isNewUser?: boolean;
  /** Snapshot of "now" used for time-based scores (recency/timing/timeOfDay). Stabilizes ordering across re-renders. */
  nowMs?: number;
}

export interface ScoredEvent {
  _score: number;
  _isExploration?: boolean;
}

export const calculateEventScore = (
  event: {
    id: string;
    is_post?: boolean | null;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    creator_id: string;
    created_at: string;
    start_datetime: string | null;
    description_tags?: string[] | null;
    guestlist_entries?: { user: { id: string } }[];
    like_count?: number | null;
    save_count?: number | null;
    impression_count?: number | null;
  },
  ctx: ScoringContext
): number => {
  const attendees = event.guestlist_entries?.length || 0;
  const isPost = !!event.is_post;
  const nowMs = ctx.nowMs ?? Date.now();

  const likes       = Number(event.like_count) || 0;
  const saves       = Number(event.save_count) || 0;
  const joins       = attendees;
  const impressions = Number(event.impression_count) || 0;

  const proximity      = getProximityScore(event.latitude, event.longitude, ctx.userLat, ctx.userLon);
  const friends        = getFriendsGoingScore(event.guestlist_entries, ctx.followingIds, ctx.mutualFollowerIds);
  const trending       = getTrendingScore(ctx.trendingCounts[event.id] || 0);
  const learned        = getLearnedPreferenceScore(event.category, event.creator_id, ctx.categoryPrefs, ctx.creatorPrefs);
  const recency        = getRecencyScore(event.created_at, nowMs);
  const timeOfDay      = getTimeOfDayScore(event.category, nowMs);
  const timing         = getTimingScore(event.start_datetime, nowMs);
  const creatorLoyalty = getCreatorLoyaltyScore(event.creator_id, ctx.creatorAttendance);
  const dayOfWeek      = getDayOfWeekScore(event.category, ctx.dayOfWeekPrefs);
  const descTags       = getDescriptionTagScore(event.description_tags || null, ctx.tagPrefs);
  const collaborative  = getCollaborativeScore(event.id, ctx.collaborativeBoosts);
  const socialProof    = getSocialProofScore(event.guestlist_entries, ctx.mutualFollowerIds);
  const velocity       = getVelocityScore(event.id, ctx.velocityCounts);
  const engagement     = getEngagementScore(likes, saves, joins, impressions);

  const hasLearnedData = Object.keys(ctx.categoryPrefs).length > 0 || Object.keys(ctx.creatorPrefs).length > 0;
  const interestRaw    = getInterestScore(event.category, ctx.userInterests);
  const interest       = ctx.isNewUser || !hasLearnedData
    ? Math.min(100, interestRaw * 1.4)
    : interestRaw;

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
      collaborative * 0.05 +
      socialProof   * 0.03 +
      proximity     * 0.02;
  } else {
    base =
      trending                       * 0.14 +
      friends                        * 0.12 +
      proximity                      * 0.10 +
      getPopularityScore(attendees)  * 0.10 +
      engagement                     * 0.08 +
      learned                        * 0.07 +
      interest                       * 0.07 +
      creatorLoyalty                 * 0.06 +
      descTags                       * 0.05 +
      collaborative                  * 0.05 +
      recency                        * 0.05 +
      timeOfDay                      * 0.04 +
      dayOfWeek                      * 0.03 +
      socialProof                    * 0.02 +
      timing                         * 0.02;
  }

  // V7: multiplicative quality penalty for dead content.
  return base * getQualityMultiplier(likes, saves, joins, impressions, event.created_at, nowMs);
};

// Seeded PRNG (mulberry32) — deterministic shuffle so exploration cards
// don't jump around on re-renders. Pinterest/Instagram-style stable order.
const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashSeed = (input: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// ───────── Diversity / Exploration injection ─────────
export const injectExploration = <T extends { _score: number; category?: string | null }>(
  scored: T[],
  categoryPrefs: Record<string, number>,
  seed: number = 1,
): (T & { _isExploration?: boolean })[] => {
  if (scored.length < 6) return scored;

  const explorationRatio = 0.15;
  const explorationSlots = Math.max(1, Math.round(scored.length * explorationRatio));

  const knownCategories = new Set(Object.keys(categoryPrefs).map((c) => c.toLowerCase()));
  const explorationPool = scored.filter((e) => {
    if (!e.category) return false;
    const cat = e.category.toLowerCase();
    const score = categoryPrefs[cat] ?? categoryPrefs[e.category];
    return !knownCategories.has(cat) || (score != null && score < 20);
  });

  if (explorationPool.length === 0) return scored;

  const rand = mulberry32(seed);
  // Deterministic Fisher-Yates with seeded PRNG
  const shuffled = [...explorationPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picks = shuffled.slice(0, explorationSlots);
  const pickIds = new Set(picks.map((p) => (p as any).id));

  const mainFeed = scored.filter((e) => !pickIds.has((e as any).id));

  const result: (T & { _isExploration?: boolean })[] = [];
  const interval = Math.max(3, Math.floor(mainFeed.length / (picks.length + 1)));

  let pickIdx = 0;
  for (let i = 0; i < mainFeed.length; i++) {
    result.push(mainFeed[i]);
    if (pickIdx < picks.length && (i + 1) % interval === 0) {
      result.push({ ...picks[pickIdx], _isExploration: true });
      pickIdx++;
    }
  }
  while (pickIdx < picks.length) {
    result.push({ ...picks[pickIdx], _isExploration: true });
    pickIdx++;
  }

  return result;
};

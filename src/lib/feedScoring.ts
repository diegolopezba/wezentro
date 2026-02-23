/**
 * Feed Scoring Engine for the "Para Ti" algorithm.
 *
 * Weights (v5 — with Collaborative Filtering + Social Proof):
 *   Friends Going (+ mutual boost) 14%
 *   Proximity        11%
 *   Trending          9%
 *   Learned Prefs     8%
 *   Interest Match    8%
 *   Description Tags  7%
 *   Collaborative     6%
 *   Creator Loyalty   7%
 *   Recency           7%
 *   Popularity        7%
 *   Time-of-Day       5%
 *   Day-of-Week       5%
 *   Social Proof      3%
 *   Timing            3%
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
  if (d <= 1.6) return 100;  // ~1 mile
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

export const getRecencyScore = (createdAt: string): number => {
  const h = (Date.now() - new Date(createdAt).getTime()) / 3.6e6;
  if (h <= 24) return 100;
  if (h <= 72) return 80;
  if (h <= 168) return 60;
  if (h <= 336) return 40;
  return 20;
};

export const getTimingScore = (startDatetime: string | null): number => {
  if (!startDatetime) return 50;
  const h = (new Date(startDatetime).getTime() - Date.now()) / 3.6e6;
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

  // Mutual followers count as 2x weight
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

export const getTrendingScore = (recentCount: number): number => {
  if (recentCount >= 30) return 100;
  if (recentCount >= 15) return 80;
  if (recentCount >= 8) return 60;
  if (recentCount >= 3) return 40;
  if (recentCount >= 1) return 20;
  return 5;
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

export const getTimeOfDayScore = (category: string | null): number => {
  if (!category) return 50;
  const period = getTimePeriod(new Date().getHours());
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

// ───────── NEW v5: Collaborative Filtering ─────────
export const getCollaborativeScore = (
  eventId: string,
  collaborativeBoosts: Record<string, number>
): number => {
  const boost = collaborativeBoosts[eventId];
  if (!boost) return 0;
  // boost = number of similar users who engaged (1-5)
  if (boost >= 4) return 100;
  if (boost >= 3) return 80;
  if (boost >= 2) return 60;
  if (boost >= 1) return 40;
  return 0;
};

// ───────── NEW v5: Social Proof (mutual followers attending) ─────────
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
  trendingCounts: Record<string, number>;
  creatorAttendance: Record<string, number>;
  dayOfWeekPrefs: Record<string, number>;
  tagPrefs: Record<string, number>;
  // v5 additions
  collaborativeBoosts: Record<string, number>;
  mutualFollowerIds: string[] | null;
}

export interface ScoredEvent {
  _score: number;
  _isExploration?: boolean;
}

export const calculateEventScore = (
  event: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    category: string | null;
    creator_id: string;
    created_at: string;
    start_datetime: string | null;
    description_tags?: string[] | null;
    guestlist_entries?: { user: { id: string } }[];
  },
  ctx: ScoringContext
): number => {
  const attendees = event.guestlist_entries?.length || 0;

  const proximity       = getProximityScore(event.latitude, event.longitude, ctx.userLat, ctx.userLon);
  const friends         = getFriendsGoingScore(event.guestlist_entries, ctx.followingIds, ctx.mutualFollowerIds);
  const trending        = getTrendingScore(ctx.trendingCounts[event.id] || 0);
  const learned         = getLearnedPreferenceScore(event.category, event.creator_id, ctx.categoryPrefs, ctx.creatorPrefs);
  const interest        = getInterestScore(event.category, ctx.userInterests);
  const recency         = getRecencyScore(event.created_at);
  const timeOfDay       = getTimeOfDayScore(event.category);
  const timing          = getTimingScore(event.start_datetime);
  const creatorLoyalty  = getCreatorLoyaltyScore(event.creator_id, ctx.creatorAttendance);
  const dayOfWeek       = getDayOfWeekScore(event.category, ctx.dayOfWeekPrefs);
  const descTags        = getDescriptionTagScore(event.description_tags || null, ctx.tagPrefs);
  const collaborative   = getCollaborativeScore(event.id, ctx.collaborativeBoosts);
  const socialProof     = getSocialProofScore(event.guestlist_entries, ctx.mutualFollowerIds);

  return (
    friends        * 0.14 +
    proximity      * 0.11 +
    trending       * 0.09 +
    learned        * 0.08 +
    interest       * 0.08 +
    descTags       * 0.07 +
    collaborative  * 0.06 +
    creatorLoyalty * 0.07 +
    recency        * 0.07 +
    getPopularityScore(attendees) * 0.07 +
    timeOfDay      * 0.05 +
    dayOfWeek      * 0.05 +
    socialProof    * 0.03 +
    timing         * 0.03
  );
};

// ───────── Diversity / Exploration injection ─────────
export const injectExploration = <T extends { _score: number; category?: string | null }>(
  scored: T[],
  categoryPrefs: Record<string, number>
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

  const shuffled = [...explorationPool].sort(() => Math.random() - 0.5);
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

/**
 * Feed Scoring Engine for the "Para Ti" algorithm.
 *
 * Weights (v3 — with Creator Loyalty + Day-of-Week):
 *   Friends Going    15%
 *   Proximity        13%
 *   Trending         10%
 *   Learned Prefs    10%
 *   Interest Match   10%
 *   Creator Loyalty   8%  ← NEW
 *   Recency           8%
 *   Popularity        7%
 *   Time-of-Day       6%
 *   Day-of-Week       5%  ← NEW
 *   Timing (upcoming) 3%
 *   Dwell feeds into Learned Prefs implicitly
 *   Diversity bonus applied as post-processing (15-20% exploration slots)
 */

// ───────── helpers ─────────

const haversine = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 3959; // miles
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
  if (d <= 1) return 100;
  if (d <= 5) return 80;
  if (d <= 10) return 60;
  if (d <= 25) return 40;
  if (d <= 50) return 20;
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
  followingIds: string[] | null
): number => {
  if (!followingIds?.length) return 50;
  if (!guestEntries?.length) return 10;
  const ids = guestEntries.map((e) => e.user?.id).filter(Boolean);
  const n = ids.filter((id) => followingIds.includes(id)).length;
  if (n >= 5) return 100;
  if (n >= 3) return 80;
  if (n >= 2) return 60;
  if (n >= 1) return 40;
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

// ───────── NEW: Trending Velocity ─────────
/**
 * Score based on how many interactions an event received in the last 24 h.
 * `recentCount` should be pre-computed from the event_interactions table.
 */
export const getTrendingScore = (recentCount: number): number => {
  if (recentCount >= 30) return 100;
  if (recentCount >= 15) return 80;
  if (recentCount >= 8) return 60;
  if (recentCount >= 3) return 40;
  if (recentCount >= 1) return 20;
  return 5;
};

// ───────── NEW: Time-of-Day Personalization ─────────
/**
 * Boost events whose category matches the current time context.
 *
 * Morning   (6-11):  brunch, fitness, wellness, networking
 * Afternoon (11-17): shopping, culture, food, sports
 * Evening   (17-21): dinner, drinks, music, concerts
 * Night     (21-6):  nightlife, party, bar, club, fiesta, DJ
 */
const TIME_CATEGORY_MAP: Record<string, string[]> = {
  morning:   ["brunch", "fitness", "wellness", "networking", "yoga", "café", "cafe", "desayuno"],
  afternoon: ["shopping", "culture", "food", "sports", "arte", "museo", "deporte", "comida"],
  evening:   ["dinner", "drinks", "music", "concerts", "cena", "concierto", "música", "happy hour"],
  night:     ["nightlife", "party", "bar", "club", "fiesta", "dj", "noche", "antro", "rave"],
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
  return 40; // neutral-ish for non-matching
};

// ───────── NEW: Creator Loyalty ─────────
/**
 * Boost events from creators the user has repeatedly attended.
 */
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

// ───────── NEW: Day-of-Week Patterns ─────────
/**
 * Boost events whose category matches what the user typically engages with
 * on the current day of week.
 */
export const getDayOfWeekScore = (
  category: string | null,
  dayPrefs: Record<string, number>
): number => {
  if (!category || !Object.keys(dayPrefs).length) return 50;
  const score = dayPrefs[category.toLowerCase()] ?? dayPrefs[category];
  if (score != null) return Math.min(100, score);
  return 30; // unknown category for this day
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
    guestlist_entries?: { user: { id: string } }[];
  },
  ctx: ScoringContext
): number => {
  const attendees = event.guestlist_entries?.length || 0;

  const proximity       = getProximityScore(event.latitude, event.longitude, ctx.userLat, ctx.userLon);
  const friends         = getFriendsGoingScore(event.guestlist_entries, ctx.followingIds);
  const trending        = getTrendingScore(ctx.trendingCounts[event.id] || 0);
  const learned         = getLearnedPreferenceScore(event.category, event.creator_id, ctx.categoryPrefs, ctx.creatorPrefs);
  const interest        = getInterestScore(event.category, ctx.userInterests);
  const recency         = getRecencyScore(event.created_at);
  const timeOfDay       = getTimeOfDayScore(event.category);
  const timing          = getTimingScore(event.start_datetime);
  const creatorLoyalty  = getCreatorLoyaltyScore(event.creator_id, ctx.creatorAttendance);
  const dayOfWeek       = getDayOfWeekScore(event.category, ctx.dayOfWeekPrefs);

  return (
    friends        * 0.15 +
    proximity      * 0.13 +
    trending       * 0.10 +
    learned        * 0.10 +
    interest       * 0.10 +
    creatorLoyalty * 0.08 +
    recency        * 0.08 +
    getPopularityScore(attendees) * 0.07 +
    timeOfDay      * 0.06 +
    dayOfWeek      * 0.05 +
    timing         * 0.03
  );
};

// ───────── NEW: Diversity / Exploration injection ─────────
/**
 * After scoring, replace ~15% of the feed with "exploration" events —
 * events from categories the user hasn't engaged with much.
 * This prevents echo chambers and helps users discover new content.
 */
export const injectExploration = <T extends { _score: number; category?: string | null }>(
  scored: T[],
  categoryPrefs: Record<string, number>
): (T & { _isExploration?: boolean })[] => {
  if (scored.length < 6) return scored; // too few events to diversify

  const explorationRatio = 0.15;
  const explorationSlots = Math.max(1, Math.round(scored.length * explorationRatio));

  // Identify "exploration" events: categories user has low or no affinity for
  const knownCategories = new Set(Object.keys(categoryPrefs).map((c) => c.toLowerCase()));
  const explorationPool = scored.filter((e) => {
    if (!e.category) return false;
    const cat = e.category.toLowerCase();
    const score = categoryPrefs[cat] ?? categoryPrefs[e.category];
    return !knownCategories.has(cat) || (score != null && score < 20);
  });

  if (explorationPool.length === 0) return scored;

  // Shuffle exploration pool
  const shuffled = [...explorationPool].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, explorationSlots);
  const pickIds = new Set(picks.map((p) => (p as any).id));

  // Remove picked events from main list
  const mainFeed = scored.filter((e) => !pickIds.has((e as any).id));

  // Distribute exploration events evenly through the feed
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
  // Append remaining picks
  while (pickIdx < picks.length) {
    result.push({ ...picks[pickIdx], _isExploration: true });
    pickIdx++;
  }

  return result;
};


## Full Analysis: How Good Is the Algorithm? What Needs to Improve?

### Current State — What's Actually Good
The algorithm is genuinely sophisticated for a startup. It has:
- 14 weighted signals covering social, behavioral, contextual, and collaborative dimensions
- Real dwell-time tracking (3s positive, <1s negative) via IntersectionObserver
- Collaborative filtering (similar users' interactions)
- Mutual follow boost, day-of-week personalization, description tag matching
- 15% exploration injection to fight filter bubbles
- Signal decay built into the 0.7/0.3 moving average formula

### Core Problems to Fix (Why Content Isn't Going Viral)

**1. The crash bug on line 183 in Index.tsx — CRITICAL**
`format(new Date(event.start_datetime), ...)` when `start_datetime` is null crashes or produces garbage for posts. This means posts are silently failing to render for many users — content can't go viral if it's invisible.

**2. Posts are penalized by the timing signal (3% of score)**
`getTimingScore(null)` returns 50 — neutral but that's not the problem. The real issue: posts have NO inherent virality multiplier. A post from 1 hour ago by someone with 500 followers scores the same as a post from a new creator. Instagram/TikTok solve this with a **velocity signal** — if a post gets 10 likes in 1 hour, it explodes everywhere.

**3. The trending signal looks back 24h at ALL interaction types equally**
`event_interactions` counts every "scroll_past" and "view" equally with "like" and "join". A post that 50 people scrolled past scores the same trending-wise as one that 50 people liked. This dilutes the signal massively.

**4. Recency decay is too aggressive for events**
Events posted 2 weeks before the event date score only 20/100 on recency — but they may be the most relevant upcoming event. Events need a **dual recency**: post recency AND event proximity. Currently these fight each other.

**5. New users get a broken experience**
With no `categoryPrefs`, `creatorPrefs`, `tagPrefs` etc., new users get `return 50` (neutral) on 5 out of 14 signals. The feed is essentially random. Instagram/TikTok bootstrap new users by using their onboarding interests + trending content. Zentro's onboarding collects `interests` from profiles but the `getInterestScore` check only gets 8% weight and returns 20 for no-match. It should be much more dominant for cold-start users.

**6. No "not interested" button**
`SIGNAL_WEIGHTS` has `not_interested: -100` defined but there's no UI to trigger it. Without explicit negative feedback, the algorithm can't correct itself. Instagram has "Not interested" on every post.

**7. Posts vs events never get differentiated scoring**
`calculateEventScore` treats both identically. A post deserves:
- Higher recency weight (freshness is everything)
- No timing penalty
- Likes/reposts as velocity signals

---

### Plan: Algorithm V6 — "Viral Mechanics"

#### Fix 1 — Critical crash fix (Index.tsx line 183)
```ts
date: event.start_datetime
  ? format(new Date(event.start_datetime), "EEE, d MMM • h:mm a", { locale: es })
  : "",
```

#### Fix 2 — Post/Event differentiated scoring in `feedScoring.ts`
Detect `is_post` flag in the event object and apply separate weight distributions:

**Posts** (need virality):
```
recency      × 0.30  (freshness is primary signal)
friends      × 0.14  (same)
interest     × 0.10
learned      × 0.10
trending     × 0.12  (velocity matters more)
tags         × 0.08
collaborative × 0.06
socialProof  × 0.05
timeOfDay    × 0.03
proximity    × 0.02  (posts aren't location-bound)
```

**Events** (keep current weights, remove timing fight):
```
friends      × 0.14
proximity    × 0.12  (slightly up, events ARE location-bound)
trending     × 0.09
learned      × 0.08
interest     × 0.08
tags         × 0.07
collaborative × 0.06
creatorLoyalty × 0.07
recency      × 0.06  (slightly down vs posts)
popularity   × 0.07
timeOfDay    × 0.05
dayOfWeek    × 0.05
socialProof  × 0.03
timing       × 0.03
```

#### Fix 3 — Trending signal quality: weight by interaction type
In `useForYouEvents.ts`, the trending query counts ALL interactions. Change it to apply weights:
- `join`, `save`: weight 5
- `like`, `repost`: weight 3
- `click`, `dwell`: weight 1
- `scroll_past`, `view`: weight 0 (exclude)

This means trending score now reflects genuine engagement, not passive views.

#### Fix 4 — Velocity score for posts (NEW signal)
Add a `getVelocityScore` function: if a post got N likes/reposts/joins in the last 2 hours, it gets a massive boost. This is exactly how TikTok's "For You" works — early engagement velocity predicts virality.
```ts
export const getVelocityScore = (
  eventId: string,
  velocityCounts: Record<string, number>
): number => {
  const v = velocityCounts[eventId] || 0;
  if (v >= 10) return 100;
  if (v >= 5) return 80;
  if (v >= 3) return 60;
  if (v >= 1) return 40;
  return 0;
};
```
The velocity data comes from a 2-hour window of `event_interactions` filtered to `like/repost/join` types — fetched in `useForYouEvents` alongside trending data.

#### Fix 5 — Cold start boost for new users
In `calculateEventScore`, detect when user has no learned preferences (all empty) and temporarily amplify `interest` (from profile onboarding) to 0.25 weight. This makes the very first sessions personalized by their stated interests, not random.

#### Fix 6 — "No me interesa" (Not Interested) button
Add a long-press or swipe gesture on EventCard, or a 3-dot menu option, that fires `trackPreferenceSignal(userId, eventId, "not_interested")`. This is the most important feedback loop missing. Without it the algorithm is one-directional.

#### Fix 7 — Following feed: posts must use repost timing
In `useFollowingEventsScored`, the scoring for posts from followed creators currently uses `getPostRecencyScore(event.created_at)` — but for reposted events, `mostRecentRepostAt` is the relevant recency, not the original `created_at`. A repost of a 2-week-old post should score as fresh as a new post.

---

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Fix line 183 null crash |
| `src/lib/feedScoring.ts` | Split post/event scoring, add `getVelocityScore`, fix trending quality |
| `src/hooks/useForYouEvents.ts` | Weighted trending query, add 2h velocity query, cold-start boost |
| `src/hooks/useFollowingEventsScored.ts` | Use `mostRecentRepostAt` for repost recency |
| `src/components/events/EventCard.tsx` | Add "No me interesa" long-press/menu option |
| `src/lib/preferenceTracking.ts` | Already handles `not_interested` — just needs to be called |

---

### What This Achieves vs Instagram/TikTok

| Feature | Instagram | TikTok | Zentro V5 | Zentro V6 |
|---------|-----------|--------|-----------|-----------|
| Velocity/early signal | Yes | Yes (primary) | No | Yes |
| Post vs content differentiated scoring | Yes | Yes | No | Yes |
| Negative feedback | Yes | Yes | UI missing | Yes |
| Cold start handling | Yes | Yes | Weak (50/100) | Improved |
| Quality-weighted trending | Yes | Yes | No (counts all) | Yes |
| Repost freshness | Yes | N/A | Wrong (uses original date) | Yes |

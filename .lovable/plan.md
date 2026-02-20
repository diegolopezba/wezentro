

# Algorithm Enhancements: Dwell Time, Repeat Creator Loyalty, Day-of-Week Patterns

## Overview

Three new signals to make the "Para Ti" feed smarter:

1. **Enhanced Dwell Time Tracking** -- Currently only tracks negative signals (scroll past < 1s). We'll add positive dwell time signals when users linger on a card for 3+ seconds, feeding that as implicit interest into preferences.

2. **Repeat Creator Loyalty** -- Boost events from creators where the user has attended 2+ previous events. Users who repeatedly attend a creator's events are likely fans.

3. **Day-of-Week Patterns** -- Learn which categories users engage with on specific days (e.g., parties on Fridays, brunch on Sundays) and boost matching content.

---

## Feature 1: Enhanced Dwell Time

**Current state:** `EventFeed.tsx` already has an `IntersectionObserver` tracking `scroll_past` (< 1s). We enhance it to also fire a `dwell` signal when a card is visible for 3+ seconds.

**Changes:**
- `src/lib/preferenceTracking.ts` -- Add `dwell` signal type with weight 15 (mild positive, between `view` and `click`)
- `src/components/events/EventFeed.tsx` -- Extend the existing `useDwellTimeTracker` hook to fire a `dwell` signal when a card stays visible for 3+ seconds (fire once per event per session)

## Feature 2: Repeat Creator Loyalty

**Database:** Create a new table `user_creator_attendance` or query existing `guestlist_entries` joined with `events` to count past attendance per creator. Since `guestlist_entries` + `events` already has this data, we'll query it directly -- no new table needed.

**Changes:**
- `src/hooks/useForYouEvents.ts` -- Add a query to fetch the user's attendance count per creator (from `guestlist_entries` joined with `events`)
- `src/lib/feedScoring.ts` -- Add `getCreatorLoyaltyScore()` function: 3+ events = 100, 2 events = 70, 1 event = 40, 0 = 0. Add it as a new 8% weight factor (re-balance existing weights slightly)
- `ScoringContext` -- Add `creatorAttendance: Record<string, number>` field

## Feature 3: Day-of-Week Patterns

**Database:** Create a new table `user_day_preferences` to store learned category affinities per day of week.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK |
| day_of_week | int | 0=Sunday through 6=Saturday |
| category | text | |
| score | numeric | 0-100 |
| interaction_count | int | |
| last_interaction | timestamptz | |

RLS: Users can read/insert/update their own rows only.

**Changes:**
- `src/lib/preferenceTracking.ts` -- After tracking category preference, also update `user_day_preferences` for the current day of week
- `src/hooks/useForYouEvents.ts` -- Fetch today's day-of-week preferences
- `src/lib/feedScoring.ts` -- Add `getDayOfWeekScore()`: if the event's category has a high score for today's day, boost it. Add as ~5% weight (re-balance)

---

## Weight Rebalance

Current weights sum to 100%. After adding Creator Loyalty (8%) and Day-of-Week (5%), we reduce existing weights slightly:

| Signal | Current | New |
|--------|---------|-----|
| Friends Going | 18% | 15% |
| Proximity | 15% | 13% |
| Trending | 12% | 10% |
| Learned Prefs | 12% | 10% |
| Interest Match | 12% | 10% |
| Recency | 10% | 8% |
| Time-of-Day | 8% | 6% |
| Popularity | 8% | 7% |
| Timing | 5% | 3% |
| **Creator Loyalty** | -- | **8%** |
| **Day-of-Week** | -- | **5%** |
| **Dwell (via Learned Prefs)** | -- | *(implicit)* |

Dwell time feeds into the existing Learned Preferences score indirectly (it updates category/creator preference tables), so it doesn't need its own weight.

---

## Technical Details

### Files to create:
- Database migration for `user_day_preferences` table with RLS

### Files to modify:
- `src/lib/preferenceTracking.ts` -- Add `dwell` signal, day-of-week preference upsert
- `src/components/events/EventFeed.tsx` -- Extend dwell time observer for positive signals
- `src/hooks/useForYouEvents.ts` -- Add creator attendance + day-of-week preference queries
- `src/lib/feedScoring.ts` -- Add `getCreatorLoyaltyScore`, `getDayOfWeekScore`, rebalance weights, update `ScoringContext`
- `src/hooks/useUserPreferences.ts` -- Optionally extend to include day preferences


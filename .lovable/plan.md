

# Targeted Sponsored Posts + Algorithmic Refinement

## Part 1: Targeted Sponsored Posts

Currently, sponsored posts are shown to ALL users with no filtering. Businesses need the ability to target their promotions by category, geographic radius, and audience demographics.

### Database Changes

Add targeting columns to the `sponsored_posts` table:

- `target_categories TEXT[]` -- array of category filters (e.g., `['party', 'concert']`), null means "all"
- `target_radius_km NUMERIC` -- max distance in km from the event location, null means "no geo filter"
- `target_gender TEXT` -- gender filter ('male', 'female', 'all'), null means "all"
- `target_age_min INTEGER` -- minimum age, null means no minimum
- `target_age_max INTEGER` -- maximum age, null means no maximum

### Filtering Logic (Client-side)

Update `useActiveSponsoredPosts` to also fetch the new targeting columns. Then in `Index.tsx`, filter sponsored posts before injection:

1. **Category match**: If `target_categories` is set, only show the ad if the viewer has interacted with or has interests in at least one of those categories
2. **Radius match**: If `target_radius_km` is set, compute haversine distance between the user's location and the event's lat/lng; skip if too far
3. **Demographics match**: If age/gender filters are set, compare against the viewer's `profiles.birth_date` and `profiles.gender`

### Dashboard UI Updates

Update `PromocionesSection.tsx` create dialog to add targeting fields:
- Multi-select for categories (party, bar, concert, fitness, culture)
- Radius slider (1-50 km)
- Age range inputs (min/max)
- Gender selector (Todos, Masculino, Femenino)

Update `useCreateSponsoredPost` to accept and persist the new targeting params.

---

## Part 2: Algorithmic Refinement

Two new signals added to the scoring engine:

### A. Collaborative Filtering (new weight: 6%)

Find users with similar taste profiles and boost events they've engaged with.

**How it works:**
1. New query in `useForYouEvents`: fetch the top 5 "similar users" by comparing `user_category_preferences` overlap (users who like the same categories with similar scores)
2. Fetch events those similar users recently interacted with positively (join, save, like)
3. Pass a `collaborativeBoosts: Record<string, number>` map into the scoring context
4. New scoring function `getCollaborativeScore()`: if an event appears in the collaborative set, boost it proportionally to how many similar users engaged with it

### B. Social Proof / Mutual Followers Boost (new weight: +3% added to Friends Going)

Currently "Friends Going" counts any followed user attending. Upgrade to weight mutual followers more heavily than one-way follows.

**How it works:**
1. Fetch mutual followers using the existing `get_mutual_followers` RPC
2. In `getFriendsGoingScore()`, count mutual followers attending as 2x weight vs. regular follows
3. This makes events where close friends (mutuals) are going rank significantly higher

### Updated Weight Distribution (v5)

| Signal | v4 | v5 |
|---|---|---|
| Friends Going (with mutual boost) | 14% | 14% |
| Proximity | 12% | 11% |
| Trending | 10% | 9% |
| Learned Prefs | 9% | 8% |
| Interest Match | 9% | 8% |
| Description Tags | 8% | 7% |
| **Collaborative Filtering** | -- | **6%** |
| Creator Loyalty | 8% | 7% |
| Recency | 7% | 7% |
| Popularity | 7% | 7% |
| Time-of-Day | 5% | 5% |
| Day-of-Week | 5% | 5% |
| **Social Proof (mutual boost)** | -- | **3%** |
| Timing | 3% | 3% |

---

## Files to Change

| File | Change |
|---|---|
| New migration SQL | Add 5 targeting columns to `sponsored_posts` |
| `src/hooks/useSponsoredPosts.ts` | Fetch targeting columns; accept targeting params in create mutation |
| `src/components/dashboard/PromocionesSection.tsx` | Add targeting fields to create dialog |
| `src/pages/Index.tsx` | Filter sponsored posts by targeting criteria before injection |
| `src/lib/feedScoring.ts` | Add `getCollaborativeScore()`, update `getFriendsGoingScore()` for mutual boost, adjust all weights to v5 |
| `src/hooks/useForYouEvents.ts` | Add queries for collaborative filtering data (similar users' events) and mutual followers list; pass new context to scoring engine |

## Technical Details

- Collaborative filtering query: Use a DB function or client-side approach that finds users with the most category preference overlap, then fetches their recent positive interactions. Limited to top 5 similar users and last 7 days of interactions to keep query fast.
- Targeting filters run client-side since the sponsored post volume is low (typically <20 active posts). No need for server-side filtering complexity.
- Mutual followers are already available via the `get_mutual_followers` RPC function.


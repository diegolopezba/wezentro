
## Analysis of Current Architecture vs. 1M Scale

### Critical bottlenecks found:

**1. Feed Query — No Pagination, Full Table Scan**
`useForYouEvents` fetches ALL public events with `.eq("is_public", true)` — no `.limit()`, no cursor. At 1M events this is a disaster: it would load thousands of rows, join guestlist_entries for every single one, and send it all to the client to score in JavaScript.

**2. Event Interactions Table — No Limit on Trending Query**
The trending query fetches ALL event_interactions from the last 24h with no limit. At 1M users this could be millions of rows per query.

**3. useChats — Fetches ALL Messages for All Chats**
`useUserChats` fetches every message across ALL of a user's chats (no limit per chat) just to compute unread counts. This is an N+1 pattern that explodes at scale.

**4. Feed Scoring is Done Entirely Client-Side**
The full 14-signal scoring algorithm runs in the browser after fetching raw events. At 1M posts, the client can't process this — it needs to be a server-side database function.

**5. Collaborative Filtering Makes 3 Sequential DB Queries Per Feed Load**
Each feed load runs: (1) get my prefs, (2) find similar users, (3) get their interactions. These are unbounded queries at scale.

**6. No Database Indexes Mentioned**
The schema has no explicit indexes on `events.is_public`, `events.creator_id`, `events.start_datetime`, `event_interactions.created_at`, etc. Full scans on million-row tables.

**7. Images/Videos — No CDN or Responsive Sizing**
Storage is a single Supabase bucket with no image transformation pipeline, no CDN layer, no lazy-loaded responsive images.

**8. No Pagination Anywhere**
Messages, timelines, notifications, guestlists — all fetched in full with no pagination or infinite scroll backed by cursor queries.

---

## The Plan

### Phase 1 — Database Indexes (Immediate, Zero Code Changes)
Add composite indexes on the most-queried columns. This alone can give 10-100x query speed improvements on large tables with zero application changes.

```text
events:
  - (is_public, deleted_at, created_at DESC)  ← for feed
  - (creator_id, deleted_at)                  ← for profile timeline
  - (start_datetime)                           ← for upcoming events

event_interactions:
  - (created_at, event_id)                    ← for trending
  - (user_id, type, created_at)               ← for collaborative filtering

guestlist_entries:
  - (event_id, status)                        ← for guestlist lookups
  - (user_id, status)                         ← for user's joined events

notifications:
  - (user_id, is_read, created_at DESC)       ← for notification feed

messages:
  - (chat_id, created_at DESC)               ← for message pagination

follows:
  - (follower_id)                             ← for following feed
```

### Phase 2 — Fix Feed Query (Pagination + Limit)
Add `.limit(100)` to the feed query immediately (prevents runaway data) and implement cursor-based pagination (load more) so only ~20 events are fetched per page.

The `for-you-events` query changes from:
```
fetch ALL events → score in JS → show top N
```
to:
```
fetch top 200 by recency/location pre-filter → score in JS → show top 50
→ load more button fetches next 200
```

### Phase 3 — Fix Chat Message Query
The `useUserChats` hook fetches ALL messages for ALL chats. Replace this with a single SQL function `get_chat_list_with_unread` that:
- Gets the last 1 message per chat (using `DISTINCT ON` or a window function)
- Counts unread messages using an indexed `WHERE created_at > last_read_at` per chat
- Returns both in a single query instead of one big messages dump

### Phase 4 — Move Feed Pre-Scoring to Database
Create a Postgres function `get_scored_feed` that pre-filters events server-side based on:
- User's location (bounding box filter)
- Category interests (match against user's interests array)
- Recency (only events from last 30 days or future)
- Trending (pre-computed materialized view or cached counter)

This reduces the client-side scoring from "score 5000 events" to "score 50 pre-filtered candidates."

### Phase 5 — Trending Pre-computation
Instead of querying event_interactions in real time, create a `trending_scores` table updated by a scheduled database function every 15 minutes. The feed query reads from this table instead of aggregating millions of interaction rows live.

### Phase 6 — Image Optimization
Add `?width=400&quality=75` query params to all image URLs via Supabase Storage's built-in image transformation API (already available). This ensures the feed loads thumbnails (~20KB) not full images (~500KB).

---

## What We'll Implement Now

The highest-impact, lowest-risk changes that can be done immediately:

1. **Database indexes** via a migration — no code changes, immediate impact
2. **Feed query limit** — cap at 200 events max, add cursor for "load more"
3. **Chat messages fix** — replace full message dump with a server-side function for last-message + unread count
4. **Trending query limit** — add `.limit(500)` to the interactions query
5. **Image transformations** — add width/quality params to feed image URLs

These 5 changes would handle the majority of the scaling bottlenecks without requiring an architectural rewrite.

### Files to modify:
- **New migration**: `supabase/migrations/` — add indexes + `get_chat_list_with_unread` function
- **`src/hooks/useForYouEvents.ts`**: add `.limit(200)` to events query + cap trending query
- **`src/hooks/useChats.ts`**: replace message-dump with the new DB function
- **`src/components/events/EventCard.tsx`**: add image transformation params
- **`src/pages/Index.tsx`**: wire up "load more" / pagination state

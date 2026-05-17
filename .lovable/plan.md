
## Goal

Make the Para Ti feed survive a ~50k new-user spike without upgrading the Cloud instance, by moving heavy aggregation off the hot path (Instagram/Pinterest/TikTok two-stage pattern: cheap retrieval + cheap ranking, never recompute at request time).

No frontend rewrites. `feedScoring.ts`, `EventFeed`, `EventCard` stay untouched.

---

## Step 1 — Database indexes (migration)

Add composite indexes on the hot paths the feed RPCs and client queries hit:

- `events (is_public, deleted_at, is_post, start_datetime, created_at DESC)` — primary scan for `get_for_you_events`
- `events (creator_id, created_at DESC)` — profile timelines
- `event_interactions (event_id, type, created_at DESC)` — trending aggregation
- `event_interactions (user_id, type, created_at DESC)` — collaborative boosts
- `guestlist_entries (event_id, status, joined_at)` — attendee avatars lateral
- `guestlist_entries (user_id, status)` — creator-attendance hook
- `event_media (event_id, display_order)` — media lateral
- `follows (follower_id)` and `follows (following_id)` — already likely exist, verify
- `user_category_preferences (category, score DESC)` — collab scan
- `user_tag_preferences (user_id)`, `user_day_preferences (user_id, day_of_week)`

All as `CREATE INDEX IF NOT EXISTS` so it's safe to re-run.

## Step 2 — Materialized trending cache

Replace on-demand `get_trending_scores()` (full 24h scan of `event_interactions` on every feed mount) with a precomputed table:

```text
trending_scores_cache (event_id PK, trending_score, velocity_count, updated_at)
```

- New function `refresh_trending_scores_cache()` runs the existing aggregation, upserts into the table, deletes rows older than 24h.
- Rewrite `get_trending_scores()` to `SELECT * FROM trending_scores_cache` — constant time.
- Schedule refresh every 2 min via `pg_cron` + `pg_net` calling a tiny edge function `refresh-trending-cache` (keeps long aggregation off the user connection pool). Fall back to in-DB `SELECT cron.schedule(... refresh_trending_scores_cache())` if simpler.

## Step 3 — Precomputed collaborative boosts

The current `collaborativeBoosts` query is the worst per-user fan-out (100-row scan + interactions join, per session). Replace with:

```text
user_collab_boosts_cache (user_id, event_id, boost_count, updated_at, PRIMARY KEY (user_id, event_id))
```

- `refresh_user_collab_boosts(_user_id uuid)` — runs the existing logic, upserts results, deletes stale rows for that user.
- New `get_collab_boosts(_user_id)` SECURITY DEFINER returns `event_id, boost_count` for the caller; if `updated_at` for that user is > 6 h old, fire-and-forget a refresh via `pg_notify` (or simple lazy refresh inline when empty). Cold users see empty boosts on first call — acceptable, that's exactly what Pinterest does for new users.
- Client `useForYouEvents` swaps the inline query for a single `supabase.rpc("get_collab_boosts")` call.

## Step 4 — Consolidate per-session round-trips

`useForYouEvents` currently fires up to 8 parallel queries. Combine the small per-user lookups into one RPC:

```text
get_for_you_context(_user_id uuid)
  → returns jsonb: { interests, following_ids, creator_attendance,
                     day_of_week_prefs, tag_prefs, mutual_follower_ids,
                     learned_prefs }
```

Client replaces 6 hooks with 1 (`useForYouContext`). `useUserPreferences`, `useBlockedIds` stay separate (used elsewhere). Result: ~8 queries → ~3 (`context`, `feed page`, `trending`, plus lazy `collab boosts`).

## Step 5 — Edge cache the cold first page

Add a thin edge function `get-for-you-feed` that wraps `get_for_you_events(20, null)` and sets:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=120
```

Supabase Edge runs behind Cloudflare → first-page response for guest/cold users is served from edge cache. Skip the wrapper (call RPC directly) whenever `_cursor IS NOT NULL` — only the first page is cacheable. Single biggest win at 50k concurrent.

Client change: `fetchForYouEventsPage(null, …)` calls the edge function; cursor pages keep calling the RPC directly.

## Step 6 — Load test before launch

`k6` script (run locally, not in repo): 500 VU ramping to 2000 over 5 min, hitting `get_for_you_events` + `get_collab_boosts` + auth refresh. Target p95 < 800 ms, error rate < 1%. If we miss, the only remaining lever without upgrading Cloud is shrinking the feed payload (drop `media` jsonb from the first page and lazy-load on card mount).

---

## Out of scope

- Cloud instance upgrade (user explicitly excluded)
- Auth/realtime rate limiting, push fan-out queue, media CDN — separate concerns, not feed bottlenecks
- Frontend rewrites — scoring + UI untouched

## Order of execution

1. Migration: indexes + two cache tables + refresh functions + cron + rewrite of `get_trending_scores`
2. New `get_for_you_context` + `get_collab_boosts` RPCs (same migration)
3. Edge function `get-for-you-feed` + `refresh-trending-cache`
4. Client: new `useForYouContext` hook, swap collab query, point first-page fetch at edge function
5. Verify build, then you run the k6 test before launch

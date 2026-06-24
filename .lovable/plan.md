## Why this is needed

Phases 2 & 3 created the async pipeline (`interaction_events_log` + `event_stats` + `ingest-impressions` queue), but several legacy call sites still write directly to `event_interactions` — so the cost didn't actually drop. Last 24h still recorded:

- 443 `impression` rows (the new queue is *also* inserting them after bumping the counter — double write)
- 73 `dwell` + 57 `scroll_past` rows (client calls still firing even though the RPC drops them)
- `interaction_events_log` is empty → `derive-preferences` has nothing to do, but it's still running every 5 minutes

The fix is to delete every remaining write to `event_interactions` from the hot path, and route view/impression tracking through the existing `impressionQueue`.

## Changes

### 1. `src/lib/analyticsTracking.ts` — remove direct inserts
- `trackEventView`: replace the SELECT-then-INSERT with `enqueueImpression(eventId, "view")`. Eliminates 2 round-trips per event open.
- `trackEventShare`: delete the `event_interactions` insert. Share count isn't surfaced and `event_likes`/`reposts` already cover the social-graph signal.
- `trackMenuView` / `trackReserveTap`: keep (rare, explicit taps used by business dashboard) — no change.

### 2. `supabase/functions/ingest-impressions/index.ts` — stop double-writing
- Delete lines 90–93 (the `admin.from("event_interactions").insert(interactionRows)` block) and the `interactionRows` accumulator. The denormalized `event_stats` counter is the only source the app reads.
- Update the response shape (`accepted` → `perEvent.size`).

### 3. `src/components/events/EventFeed.tsx` — drop scroll/dwell calls
- Remove the `trackPreferenceSignal(..., "dwell")` (line 54) and `trackPreferenceSignal(..., "scroll_past")` (line 84) call sites entirely. The RPC drops them anyway; removing the calls saves the function-call overhead and removes the IntersectionObserver/dwell timer bookkeeping if no other consumer needs it. Leave the observer in place only if it still serves impression tracking.

### 4. `src/lib/preferenceTracking.ts` — narrow the type
- Drop `view`, `dwell`, `scroll_past` from the `SignalType` union so TypeScript catches any future legacy caller at compile time.

### 5. `src/hooks/useBusinessAnalytics.ts` — read from `event_stats` (read-side)
- Replace the two `count: "exact"` queries on `event_interactions` for `view`/`impression` totals with a single `event_stats` read. Keep the per-day breakdown queries as-is for now (lower volume on dashboard load).

### 6. Cron tightening
- `derive-preferences-every-5min` → every 15 min. With the lower volume of likes/saves/joins it's wasteful at 5 min. Worker is idempotent.

## Out of scope (intentionally)
- Removing the `event_interactions` table — keep it for historical analytics; nightly TTL cleanup already prunes it.
- Changing RLS — the "Users can log own interactions" policy stays so any legacy mobile build doesn't error out.
- Touching the For You algorithm — Phase 1 already batched its like queries.

## Expected impact
- `event_interactions` daily inserts: ~573/day → < 50/day (just `menu_view`, `reserve_tap`, `click`).
- `ingest-impressions` halves its DB work (counter bump only, no raw insert).
- `derive-preferences` runs 3× less often.

## Validation after build
Re-run the same audit:
```sql
SELECT type, COUNT(*) FROM event_interactions WHERE created_at > now() - interval '1 hour' GROUP BY type;
SELECT COUNT(*) FROM interaction_events_log WHERE created_at > now() - interval '1 hour';
```
Expect `impression`/`dwell`/`scroll_past`/`view` to be zero, and `interaction_events_log` to show one row per like/save/join/repost/click.

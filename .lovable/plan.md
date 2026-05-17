## Add TikTok-style view counts to profile cards

Show total view count overlay on each publication card on profile pages (own profile + other users' profiles), positioned at the bottom-right of the media, matching TikTok's pattern.

### How views are already tracked

Every time a user opens an event/post, `src/lib/analyticsTracking.ts` inserts a row in `event_interactions` with `type = 'view'`. We already have ~263 view rows in production, so no new tracking is needed — only aggregation and display.

### Why we need a new RPC

`event_interactions` RLS only lets the event's creator read its rows. That means a visitor browsing someone else's profile cannot read view counts directly. We need a `SECURITY DEFINER` function that returns only the aggregate count (not who viewed), which is safe to expose publicly.

### Changes

**1. Database — new RPC**
- `get_event_view_counts(_event_ids uuid[]) RETURNS TABLE(event_id uuid, view_count bigint)` — `SECURITY DEFINER`, `STABLE`, `search_path = public`. Aggregates `event_interactions` where `type = 'view'` for the given IDs. Granted to `anon, authenticated`.

**2. `src/hooks/useUserTimeline.ts`**
- After the main query, batch-call the new RPC with all returned event IDs.
- Merge `view_count` onto each `TimelineItem`.
- Add `view_count?: number` to the `TimelineItem` interface.

**3. `src/components/events/TimelineCard.tsx`**
- New optional prop `viewCount?: number`.
- When `viewCount > 0`, render a small pill overlay in the bottom-right of the `MediaCarousel`: `Eye` icon + formatted count (reuse `formatCount` from `@/lib/utils`), with a subtle black/40 backdrop blur so it stays readable on any image, matching the existing dropdown-button styling pattern (`absolute bottom-2 right-2 z-10`, `text-white text-[11px]`, pill shape).
- Pointer-events none so taps still open the post.

**4. `src/pages/Profile.tsx` + `src/pages/UserProfile.tsx`**
- Pass `viewCount={item.view_count}` to each `TimelineCard`. No other layout changes.

### Out of scope

- Tracking changes (already working).
- Showing views anywhere outside profile timelines (feed, related, etc.).
- Per-viewer dedup (TikTok counts total plays, not unique viewers — we match that).
- Backfilling `event_analytics.views` (unused for display today).

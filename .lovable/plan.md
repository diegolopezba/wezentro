## The problem

Cards on the Para Ti / Siguiendo feed keep moving while users scroll. After investigating the code, there are **5 distinct causes**, all hitting at the same time:

1. **`injectExploration` calls `Math.random()`** on every recompute (`src/lib/feedScoring.ts:403`), so exploration cards land in different slots each time anything changes.
2. **Scores depend on `Date.now()`** (`getRecencyScore`, `getTimingScore`, `getTimeOfDayScore`, `getVelocityScore`). Time keeps moving, so scores keep changing.
3. **Six async context queries resolve at different moments** in `useForYouEvents` (`for-you-context`, `trending-velocity-rpc`, `collab-boosts-cached`, blocked IDs, learned prefs, plus the deferred "idle" collab boost). Each one that resolves re-runs the `scoredEvents` memo and **re-sorts the entire concatenated list, including cards already on screen.**
4. **Infinite scroll re-sorts globally.** When page 2 arrives, every item from every page is scored and re-sorted together, so a page-2 item with a higher score can shove page-1 cards down — exactly the "I was looking at this post and it disappeared" behavior.
5. **Sponsored-post injection in `Index.tsx`** re-runs on every events reference change and re-splices, shifting positions.

## How Instagram & Pinterest avoid this

Both apps use a **"freeze on render, append on paginate"** model:

- The first page is scored and ordered once, then **locked**. Items never move once they've been shown.
- New pages are scored only against themselves, then **appended** to the end. Existing items keep their slot and index.
- Sponsored / exploration injections happen on the page being assembled, not retroactively on items already rendered.
- Randomized signals (exploration, A/B jitter) use a **session-stable seed** (per-user, per-session) so reloads within a session produce the same order.
- Score inputs that change over time (recency, "trending now") are **snapshotted at fetch time**, not recomputed on every render.

This is sometimes called "stable ranking with append-only pagination" — it preserves a personalized feed while guaranteeing visual stability.

## What I'll change

### 1. Score & order each page once at fetch time, then freeze

In `useForYouEvents`:
- Move the scoring + `injectExploration` step out of the global `useMemo` over `events`.
- Track a `frozenOrder` ref (a `Map<eventId, { order: number; item: ScoredEvent }>`) that holds the final, locked sequence the UI renders.
- When a **new page** arrives from `useInfiniteQuery`:
  - Filter out items already in `frozenOrder` (dedupe).
  - Score only the new items using the **current snapshot** of context (whatever has resolved so far is fine — it's locked in for these items forever).
  - Run `injectExploration` over just the new page.
  - Append the result to `frozenOrder` with monotonically increasing order numbers.
- Late-arriving context queries (collab boosts, trending, etc.) **do not** retrigger re-sorting of frozen items. They'll affect *future* pages only.
- `refetch` / pull-to-refresh resets `frozenOrder` (intentional — user asked for fresh content).

### 2. Make exploration deterministic per session

- Replace `Math.random()` in `injectExploration` with a small seeded PRNG (mulberry32 or similar).
- Seed = hash of `userId + sessionStartTimestamp` (stored in a ref). Same session ⇒ same shuffle ⇒ stable order across re-renders.

### 3. Snapshot time-sensitive scores at page-fetch time

- Pass a `nowMs` parameter into `calculateEventScore` (default `Date.now()`).
- When scoring a page, capture `nowMs` once for the whole batch and reuse it. Frozen items keep their original `nowMs`, so their recency/timing scores never drift.

### 4. Stop sponsored-post re-splicing from shifting cards

In `Index.tsx` `transformedEvents`:
- Once a sponsored card has been placed at a given index, keep it there. Track placed sponsored IDs + their indices in a ref keyed by feed length buckets.
- Only insert *new* sponsored cards into *new* organic positions (the unfrozen tail), never re-splice into the already-rendered prefix.

### 5. Apply the same freeze to "Siguiendo"

`useFollowingEventsScored` has the same re-sort-on-every-dep-change pattern. Same fix: score once on first load, dedupe + append on refresh, never reorder already-shown items.

### 6. Stabilize card props identity

In `Index.tsx`, memoize the per-event transform (`organic.map(...)`) keyed by event id so card prop objects keep referential identity across renders. Combined with the existing `key={event.id}` in `EventFeed`, this avoids unnecessary `EventCard` re-renders even when the array changes at the tail.

## Files touched

- `src/hooks/useForYouEvents.ts` — freeze-on-render order, per-page scoring, snapshot time
- `src/hooks/useFollowingEventsScored.ts` — same freeze pattern
- `src/lib/feedScoring.ts` — seeded PRNG for `injectExploration`, accept `nowMs` parameter
- `src/pages/Index.tsx` — stable sponsored-post placement, memoized per-event transform

## Out of scope (intentionally)

- The ranking algorithm itself stays exactly the same. Different users still see different feeds.
- No backend / RPC changes. This is purely a client-side rendering-stability fix.
- Discover page, map, profile feeds — not reported as glitchy, leaving alone.

## Expected result

- Once a card appears, it stays in the same slot until the user pulls to refresh.
- Scrolling fetches more cards that get appended to the bottom — no items above ever move.
- Late-resolving signals (trending, collab boosts) influence future pages but never reshuffle the visible feed.
- Matches the Pinterest/Instagram feel the user described.

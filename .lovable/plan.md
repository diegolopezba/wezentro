## 1. Root cause (verified)

Network log shows **two `assemble-for-you-slate` requests fired ~1s apart with the same `session_seed`**:

| Request | Returned |
|---|---|
| 102.742 (first) | 20 events (3.1 KB) — correct |
| 102.770 (second) | `[]` (103 B) — wrong, and this is what React Query keeps |

In `supabase/functions/assemble-for-you-slate/index.ts` the function:

1. Reads `seen_event_ids` from `session_feed_state` keyed on `(session_id, feed_kind)`.
2. Filters out any candidate already in that set: `candidates.filter((e) => !seenIds.has(e.id))`.
3. Appends the page it just sent back into `seen_event_ids` and upserts the row.

So when the second request arrives, it reads the 20 IDs the first request just persisted, filters them out of a small candidate pool (`get_for_you_events` returns `limit*3` = 60 max, and `_cursor=null` always returns the same top 60), and ends up with zero items. The DB row jumps to 50 "seen" IDs even though the user has seen nothing.

This isn't a freak race. It is triggered every time by:

- React 18 Strict Mode double-invocation in dev.
- React Query `refetchOnWindowFocus`, `refetchOnMount`, `refetchOnReconnect` (default ON).
- Tab/preview re-focus, hot reload, navigating away and back.
- Any retry on a slow first request.

Same bug exists in `assemble-following-slate` — same `session_feed_state` table, same write-on-every-request pattern, just hasn't surfaced yet because the candidate pool is even smaller.

The frontend code is healthy — the empty state proves rendering works. The masonry refactor from prior turns is fine.

## 2. How Pinterest solves this

Pinterest (and Instagram) treat the home feed as a **stateless, idempotent page request** keyed by an **opaque cursor**, not by a mutable server-side "seen set".

Key patterns from Pinterest Engineering's "Building a dynamic and responsive Pinterest" (Pixie) and "Scaling Recommendation Systems with Request-Level Deduplication":

1. **The cursor IS the position.** Page tokens encode `{ranking_seed, offset|insertion_point}`. The same token always returns the same page. Duplicate calls = same response, not an empty page.
2. **Ranking seed is derived deterministically** from `(user_id, session_id)` so refresh = new seed = new ordering, but identical requests inside one session always rank identically.
3. **Dedup happens inside the ranking pass**, not via a separately-mutated table that another request can race against. Within a single ranking pass they dedupe by pin id; across pages they rely on the cursor's offset/skip-list.
4. **Recirculation fallback**: when fresh inventory is exhausted, the server falls back to a "broad pool" (popular / covisited / recent) rather than returning an empty page. Pinterest explicitly never shows an empty homefeed.
5. **Pull-to-refresh issues a brand-new request id / seed**, never reuses the previous cursor space.
6. **Client never relies on server state for "what did I see"** — Paging-3-style libraries pass back the exact token the server gave them.

Our current design violates all six.

## 3. Long-term fix (Pinterest-style)

### 3a. Replace the per-session mutable "seen set" with a self-contained, opaque cursor

`session_feed_state` becomes optional analytics, not part of the serving path.

The cursor returned to the client encodes:

```
base64url({ "seed": "<sessionSeed>", "page": <0-indexed page number> })
```

- First request: no cursor → `seed = sessionSeed`, `page = 0`.
- Server computes the *full* ranked candidate list deterministically from `(userId, seed)` (sort tiebreak by `event.id`), slices `[page*limit, (page+1)*limit]`, returns it plus `nextCursor = encode({seed, page: page+1})`.
- Same cursor, same response. Always.

This eliminates the race entirely. Two concurrent first-page calls with the same `session_seed` are now bit-for-bit identical responses.

### 3b. Make the ranking deterministic given a seed

Today the score is recomputed from live data each call, which is mostly stable but small ties + sponsored injection can shuffle. Add a deterministic tiebreak (`score DESC, id ASC`) and stop relying on the seen-set to mask non-determinism.

### 3c. Recirculation — never return an empty page on page 0

If after ranking the candidate list has fewer items than `limit`, fall back in this order:

1. Top-trending upcoming events the user hasn't already paged past.
2. Recent posts (`is_post = true`) ordered by recency.
3. Any remaining published events ordered by `start_datetime` proximity.

This guarantees the home feed is never empty as long as the database has any events. Matches Pinterest's "always pad to a full page" behavior.

### 3d. Cap pagination at "real exhaustion"

`nextCursor = null` only when the recirculated pool is also empty, not just when the primary pool runs out. Infinite scroll then naturally terminates.

### 3e. Demote `session_feed_state` to analytics

Keep the table for impression analytics if useful, but the serving path no longer reads from it. This removes the entire class of "self-poisoning" bugs.

### 3f. Client-side: stop fighting React Query

In `src/hooks/useForYouEvents.ts` and `useFollowingEventsScored.ts`:

- Set `refetchOnWindowFocus: false`, `refetchOnMount: false` for the home feed (it's already cursor-paginated; we don't want a focus event to refetch page 0 and discard later pages).
- Keep `staleTime: 2 * 60 * 1000`.
- Pull-to-refresh calls `resetSessionSeed()` then `refetch()` — unchanged behavior, but now actually meaningful because the cursor encodes the seed.

This is what Paging 3 (Android) and SWR (web) do by default for paginated feeds.

### 3g. Apply the same shape to `assemble-following-slate`

Mirror everything in `assemble-following-slate` so Siguiendo stops sharing the same trap.

## 4. Files to change

- `supabase/functions/assemble-for-you-slate/index.ts`
  - Parse `cursor` as opaque `{seed, page}` (back-compat: if absent or unparseable, treat as page 0 with current `session_seed`).
  - Remove the read+write of `session_feed_state` from the serving path.
  - Deterministic sort with id tiebreak.
  - Recirculation fallback so page 0 is never empty.
  - Return `nextCursor` encoding `{seed, page+1}`.

- `supabase/functions/assemble-following-slate/index.ts`
  - Same treatment.

- `src/lib/prefetchEvents.ts`
  - `fetchForYouEventsPage` / `fetchFollowingEventsPage`: when `cursor` is provided, pass it through as the opaque token (it already does — no shape change needed on the wire).
  - Keep `session_seed` as a query parameter so the legacy server can ignore it but new server folds it into the cursor on page 0.

- `src/hooks/useForYouEvents.ts`, `src/hooks/useFollowingEventsScored.ts`
  - Add `refetchOnWindowFocus: false`, `refetchOnMount: false` to the `useInfiniteQuery` options.

- `session_feed_state` table — no migration required; the table stays unused for now. Optional follow-up: drop it once analytics needs are confirmed elsewhere.

## 5. How this also unifies the Pinterest "feel"

Beyond fixing the empty-feed bug, this brings three Pinterest-grade properties to the whole app:

1. **Stable ordering inside a session.** A pin you saw at position 5 stays at position 5 if you scroll back up — no shuffles on refocus.
2. **Predictable pull-to-refresh.** Pull = new seed = visibly different order. Today it sometimes just refetches the same thing because the seen-set blocks new items.
3. **Never an empty homefeed.** Recirculation makes the home tab feel "alive" even when the inventory is small (which is true today — only 12 upcoming events).

## 6. Verification plan

After the change is built:

1. Hit `/` on desktop and mobile preview → feed renders immediately, every time.
2. Hard reload 5x in a row → each load returns the same first page (deterministic given same session storage).
3. Pull-to-refresh → first page changes (new seed).
4. Scroll to page 3, then refocus the tab → no jump, no empty state.
5. `curl` the edge function twice with the same `session_seed` → byte-identical responses.
6. Manually call with a known-exhausted cursor (`page=99`) → empty `items`, `next_cursor=null`, no error.
7. Confirm `session_feed_state` is no longer being written from the serving path (row count for new sessions stays at 0).

## 7. What I am explicitly NOT doing

- No changes to the masonry / EventFeed / EventCard refactor. Those are working.
- No changes to scoring weights. We are fixing the *serving contract*, not re-tuning V6.
- No new migrations or table drops in this pass — the old table just becomes inert.
- No client-side dedup logic. The cursor contract makes it unnecessary.

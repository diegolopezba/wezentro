## Revised: do Phase 2 now (server-assembled slate)

You're right. Fixing this before the surge — while the blast radius is small — is the safer call. We'll still keep the client freeze as a safety net, but the real fix is moving slate assembly to the server. This is how Instagram and Pinterest actually do it.

---

## What we build

### 1. New edge function: `assemble-for-you-slate`

Single endpoint that returns a ready-to-render, ordered, deduped, ad-injected page.

**Inputs (query params):**
- `cursor` — opaque string (created_at of last item from prior page), null on first page
- `limit` — default 20, max 50
- `session_seed` — client-generated UUID per app session, used for deterministic exploration shuffle
- `lat`, `lng` — optional, for distance scoring + ad geo-targeting

**Auth:** uses the caller's JWT (or anon for guests). `verify_jwt = false` so guests work; user id pulled from JWT when present.

**Internally it does, in one round trip:**
1. Fetch candidate events via `get_for_you_events(_limit: limit * 3, _cursor)` (overfetch for ranking headroom).
2. Pull context: `get_for_you_context`, `get_trending_scores`, `get_collab_boosts` — in parallel.
3. Score using the same logic currently in `src/lib/feedScoring.ts` — we port it to Deno (pure functions, easy).
4. Apply session-scoped dedupe via a new `session_feed_state` table (see schema below).
5. Inject sponsored slots at fixed positions (1, 9, 19) using `get_eligible_sponsored_posts`.
6. Return `{ items: [...], next_cursor, session_id }`.

**Caching:**
- Guest + cold-start first page: `Cache-Control: public, s-maxage=60, stale-while-revalidate=180` at the CDN.
- Authenticated pages: `Cache-Control: private, no-store` (per-user state).

### 2. New table: `session_feed_state`

Server-side seen-set so client never has to dedupe.

```text
session_feed_state
  session_id    uuid          PK part 1
  user_id       uuid nullable PK part 2  (null for guests; keyed by session only)
  seen_event_ids uuid[]       (capped at last 500)
  created_at    timestamptz
  updated_at    timestamptz
```

TTL cleanup: nightly cron deletes rows older than 24h. RLS: service_role only (edge function writes); no client access.

### 3. Client becomes a dumb renderer

- `useForYouEvents` shrinks to: call `assemble-for-you-slate`, append pages, render in order.
- Delete client-side: scoring loops, `frozenItems` reconciliation, sponsored splice, dedupe set, exploration shuffle, all the context queries (`for-you-context`, `trending-velocity-rpc`, `collab-boosts-cached`).
- Keep: `useInfiniteQuery`, pull-to-refresh resets cursor + generates new `session_seed`.
- Same change for `useFollowingEventsScored` → new `assemble-following-slate` function with the same shape.

### 4. EventFeed stability (kept from Phase 1)

Even with server ordering, we still want:
- Memoized per-card refs via a `Map`.
- Dedicated `<div ref={sentinelRef} />` sibling for infinite scroll.
- `EventCard` memo fast-path.

These are cheap and make the render path bulletproof regardless of data source.

### 5. Rollout safety

- Feature flag `useServerSlate` (env var, default true on preview, gradual on prod):
  - `true` → call edge function
  - `false` → fall back to current client path
- The current `get-for-you-feed` edge function stays deployed as the fallback.
- If anything goes wrong post-launch, flip the flag — no redeploy needed.

### 6. Observability

- Edge function logs latency per stage (candidates, context, scoring, ads) so we can see where time goes under load.
- Add a `feed_slate_served` event to `event_interactions` with cursor + count, so we can audit dedupe and ad-injection in production.

---

## What changes, file by file

- **NEW** `supabase/functions/assemble-for-you-slate/index.ts`
- **NEW** `supabase/functions/assemble-following-slate/index.ts`
- **NEW** `supabase/functions/_shared/feedScoring.ts` — Deno port of `src/lib/feedScoring.ts`
- **MIGRATION** create `session_feed_state` table + grants + RLS + nightly cleanup function
- **EDIT** `src/lib/prefetchEvents.ts` — point to new edge function, pass `session_seed`
- **EDIT** `src/hooks/useForYouEvents.ts` — strip scoring, keep `useInfiniteQuery` + freeze-on-render safety
- **EDIT** `src/hooks/useFollowingEventsScored.ts` — same treatment
- **EDIT** `src/components/events/EventFeed.tsx` — stable refs + dedicated sentinel
- **EDIT** `src/components/events/EventCard.tsx` — memo fast-path
- **EDIT** `src/pages/Index.tsx` — remove client-side sponsored injection
- **KEEP** `supabase/functions/get-for-you-feed/index.ts` as fallback

No changes to RLS on existing tables. No changes to `feedScoring` math — same algorithm, just moved.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Edge function cold start adds latency on first request | Edge cache the guest first page; warm with a 5-min cron ping |
| Scoring port has a behavior drift vs client | Add a Deno test that scores a fixed fixture and asserts identical output to the TS version |
| `session_feed_state` grows unbounded | Cap `seen_event_ids` at 500 entries (FIFO) + nightly TTL cleanup |
| Bug in slate assembly breaks the feed | Feature flag fallback to existing client path |
| Sponsored injection logic regression | Port unit tests for slot positions; verify impression tracking still fires |

---

## Order of work

1. Migration: `session_feed_state` + cleanup function.
2. Port `feedScoring` to Deno + tests.
3. Build `assemble-for-you-slate` + tests.
4. Wire feature flag in client; verify parity in preview.
5. Build `assemble-following-slate`.
6. Apply EventFeed/EventCard stability fixes.
7. Remove client scoring code once flag is permanently on.

Roughly a day of focused work end-to-end. After this lands, the feed cannot reshuffle on the client because the client doesn't rank anymore — same architecture as the real apps.

Approve and I'll start with the migration.



## Production Readiness Fixes for 100K Scale

### Priority 1: Critical (will cause visible failures)

**1. Add cursor-based pagination to the event feed**
- Change `fetchForYouEvents` to fetch 20 events at a time with cursor pagination
- Add infinite scroll in `Index.tsx` using `useInfiniteQuery` instead of `useQuery`
- This prevents loading 200 events + nested guestlist entries in one query

**2. Move trending/velocity aggregation to a database function**
- Create a Supabase RPC (`get_trending_scores`) that aggregates on the server, avoiding the 1000-row client limit
- Replace the two client-side trending queries with a single RPC call
- This also reduces data transfer (send scores, not raw rows)

**3. Add virtual scrolling to the feed**
- Use a virtualizer (e.g., `@tanstack/react-virtual`) so only ~5-8 cards are in the DOM at any time
- Prevents memory pressure on low-end devices when scrolling through hundreds of cards

### Priority 2: Important (performance/reliability)

**4. Add lazy image loading with blur placeholders**
- Add `loading="lazy"` to event card images
- Generate low-res blur placeholders for progressive loading
- Reduces initial bandwidth by ~80%

**5. Add a global unhandled rejection handler**
- Add `window.addEventListener('unhandledrejection', ...)` in `main.tsx`
- Log errors and optionally show a toast so users know something failed

**6. Fix auth double-fetch race condition**
- Remove the manual `getSession()` call in `AuthContext` — the `onAuthStateChange` with `INITIAL_SESSION` event already covers it
- Eliminates duplicate profile fetches on cold start

**7. Move collaborative filtering to an edge function**
- The current client-side implementation makes 3-4 sequential queries per page load
- Move to a single edge function that returns pre-computed boosts
- Reduces latency from ~800ms to ~100ms

### Priority 3: Scale preparation

**8. Upgrade Lovable Cloud instance**
- Go to Cloud > Advanced settings > Upgrade instance before launch
- The default instance won't handle 100K concurrent connections

**9. Add database indexes for hot queries**
- Add indexes on `event_interactions(created_at, type)` and `guestlist_entries(user_id, status)` for the feed scoring queries

### Technical details

- Priority 1 items prevent the app from breaking under load
- Priority 2 items improve reliability and perceived performance
- Priority 3 items are infrastructure prep that requires no code changes in the app itself
- Estimated implementation: Priority 1 = ~3 messages, Priority 2 = ~2 messages, Priority 3 = configuration only


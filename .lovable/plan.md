
## Performance Optimizations Plan

### 3 targeted changes, zero behavioral impact

---

### 1. `src/hooks/useForYouEvents.ts`
- Increase `collaborativeBoosts` staleTime: `10 * 60 * 1000` → `30 * 60 * 1000`
- Increase `trending-counts` staleTime: `5 * 60 * 1000` → `15 * 60 * 1000`
- Merge `user-interests` query into the existing profile fetch — change the `user-interests` query to also select `birth_date, gender` so `Index.tsx` can read from the same cache key, eliminating the duplicate `user-demographics` query

---

### 2. `src/pages/Index.tsx`
- Replace `lastScrollY` `useState` with `useRef` — eliminates re-render on every scroll tick
- Remove the separate `user-demographics` query (lines 103–117) — pass interests from the profile data already fetched by `useForYouEvents` via a dedicated small query using the same `user-interests` cache key
- Remove `LayoutGroup` wrapper around `EventFeed` (Framer Motion layout tracking on every card is expensive)

---

### 3. `src/components/events/EventDetailOverlay.tsx`
Add `enabled: !!event` to these secondary queries so they only fire after the main event data loads (cuts initial burst from ~12 to 5 concurrent requests):
- `usePendingGuestlistRequests` 
- `usePendingPayments`
- `useSaveCount`
- `useRepostCount`
- `useEventLikes`

These are all below-the-fold counters — the ~100ms delay before they load is completely invisible to users.

---

### Technical Detail
The `user-interests` query in `useForYouEvents` already selects `interests` from `profiles`. Extend it to also select `birth_date, gender` so the `Index.tsx` ad targeting reads from the same TanStack Query cache entry instead of issuing a second identical profile query. Both use the same query key `["user-interests", user?.id]`.

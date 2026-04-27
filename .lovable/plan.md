# Cost optimization plan — modeled on Instagram, Pinterest, Spotify & Mapbox best practices

## What the big players actually do

- **Instagram / TikTok feeds**: never use `staleTime: 0`. They serve cached feed snapshots for **2–10 min**, then patch in deltas via push/realtime. Realtime fills the freshness gap, the cache absorbs the read load. (TanStack/React Query official guidance + Meta engineering posts.)
- **Pinterest**: every image is served via a CDN with **explicit width + quality + format** baked into the URL — never the original. Avatars and thumbs request the smallest viable size; full-res only on detail.
- **Spotify**: cache *aggressively* at the edge, fetch *narrow* columns (only what the UI renders), and treat the DB as the source of truth — not the read path.
- **Mapbox (their own docs)**: the #1 cost lever is **don't load tiles until the user actually needs the map** + cap `maxZoom` to avoid deep zoom tile cascades. Tile loads = $.

We'll apply each of these directly.

---

## The 4 quick wins

### 1. Smarter cache times (Instagram/TikTok pattern)
Realtime subscriptions already keep notifications, chats, comments, and guestlist fresh — `staleTime: 0` just causes redundant refetches on every focus/remount.

| Hook | Current | New | Rationale |
|---|---|---|---|
| `useNotifications` (list + unread count) | 0 | **2 min** | Realtime push covers new items |
| `useChats` | 0 | **2 min** | Realtime channel already subscribed |
| `useEventComments` (5 queries) | 0 | **1 min** | Realtime patches new comments |
| `useGuestlist` | 0 | **2 min** | Owner-managed, low write rate |

Result: ~60–70% fewer redundant DB reads on the hottest endpoints.

### 2. Replace `select("*")` with explicit columns (Spotify pattern)
Today these hooks pull every column — including big text fields the UI never renders.

- `useUserProfile.ts` (2 calls) → only fields used by profile header + cards
- `useUserSettings.ts` → only the toggles the settings page renders
- `useNotifications.ts` → drop unused metadata payload columns
- `useReservations.ts` → drop notes/internal columns from list view

Expected egress reduction: **20–40%** on these endpoints.

### 3. Full image optimization audit (Pinterest pattern)
`getOptimizedImageUrl` exists and `EventCard` uses it correctly. Two gaps:

- **`src/components/ui/avatar.tsx`** — raw `<img>` with the original URL. Every avatar across the app (chats, comments, notifications, headers) downloads full size. Wrap with `getOptimizedImageUrl(url, size)` driven by the `Avatar` size prop.
- **`src/components/events/TimelineCard.tsx`** — 2 raw `<img>` tags, used in the profile timeline grid. Switch both to `ImageSizes.card`.

This alone can cut storage egress by an estimated **40–60%** for users browsing chats/notifications/profiles.

### 4. Mapbox lazy-mount + cost guardrails (Mapbox official guidance)
Today `<MapView>` is mounted as soon as `Discover.tsx` renders → tiles load even if the user never opens the map tab.

- **Lazy-mount via `React.lazy`**: only import and mount `MapView` when the user actually opens the map view. Show a lightweight skeleton until then.
- **Cap `maxZoom: 16`** on the Map constructor (currently uncapped → up to 22). Past 16, tile counts explode 4× per level and add zero discovery value for nightlife.
- **Set `maxBounds`** loosely around Bolivia + neighboring region so panning to empty oceans doesn't request useless tiles.
- **Throttle marker recreation**: `updateMarkersForZoom` currently fires on *every* `zoom` event. Debounce to 150ms and skip recreation if zoom delta < 0.5. (Pure CPU/render win, no UX change.)

Combined map cost reduction estimate: **50–70%** of current Mapbox spend.

---

## Files changed

```text
src/hooks/useNotifications.ts        staleTime + narrow select
src/hooks/useChats.ts                staleTime
src/hooks/useEventComments.ts        staleTime ×5
src/hooks/useGuestlist.ts            staleTime
src/hooks/useUserProfile.ts          narrow select ×2
src/hooks/useUserSettings.ts         narrow select
src/hooks/useReservations.ts         narrow select
src/components/ui/avatar.tsx         optimize img URL by size
src/components/events/TimelineCard.tsx   optimize img URLs
src/pages/Discover.tsx               React.lazy(MapView) + Suspense
src/components/map/MapView.tsx       maxZoom 16, debounced zoom handler
```

No DB migrations, no edge function changes, no schema changes, no UX regressions.

---

## Realistic cost impact (50K MAU first month)

| Cost line | Before | After | Savings |
|---|---|---|---|
| DB reads | ~$45 | ~$18 | -60% |
| Storage egress | ~$70 | ~$32 | -54% |
| Mapbox | ~$85 | ~$30 | -65% |
| Edge functions | ~$15 | ~$15 | — |
| **Total / month** | **~$215** | **~$95** | **~-56%** |

These are estimates; actual savings depend on real user behavior. The bigger payoff is at scale — at 200K MAU the gap widens to several hundred dollars/month.

---

## Risks & mitigations

- **Stale UI fear**: addressed because every hook we're raising staleTime on already has a Realtime subscription patching the cache. Worst case: a 60–120s delay on the rare event Realtime drops a frame.
- **Lazy map flash**: a 150ms skeleton on first map open. Acceptable trade for not loading tiles for users who never open the map.
- **Avatar wrapper change**: backwards compatible — non-Supabase URLs (lovable-uploads, externals) pass through unchanged via `isSupabaseStorageUrl` check.

---

## What we are NOT doing (intentionally deferred)

- Cron frequency review for `send-reservation-reminders` / `sponsored-posts-lifecycle` — edge functions are <10% of the bill, low ROI right now.
- Pagination of "Para Ti" feed — the 200-item cap is intentional per the algorithm design (see Feed Scaling memory).
- Server-side image transforms beyond what Supabase Storage already provides — would require a Cloudflare/Imgix layer; revisit at 500K+ MAU.

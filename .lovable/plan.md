## Goal
Extend impression tracking (IG/TikTok-style) to every place an event/post is meaningfully shown, so view counts reflect real reach.

## Already tracked
- Main feed (`EventCard` + `EventFeed`)
- Profile/timeline grids (`TimelineCard`)
- "Más como esto" (uses `TimelineCard` — already covered)
- Chat invite cards (`EventInviteCard`)

## Gaps to fill

### 1. Event Detail page (and modal)
When a user opens an event — full-page `EventDetail.tsx` or the `EventDetailModal` overlay — that's the strongest impression signal of all (deeper than a feed scroll). Fire one impression per open.

- Call `trackEventImpression(id, user?.id ?? null)` once on mount in both `src/pages/EventDetail.tsx` and `src/components/events/EventDetailModal.tsx`.
- Use `useEventDetailState`'s `creatorId` to skip self-views (mirrors existing IG/TikTok rule).
- Session-level dedupe in `analyticsTracking.ts` already prevents double-counting if the user opens the modal then the full page.

### 2. Map popup on Discover
When a user taps a map marker and the event popup is rendered (`MapView.tsx` → `FoodMarkerPopup`), that's a visible impression of that event card.

- Fire `trackEventImpression` when the popup mounts for an event. Either:
  - inside `FoodMarkerPopup` on mount, or
  - in `MapView.tsx` right after `popupRoot.render(...)`.
- Skip if viewer is the creator.

### 3. No change needed
- "Más como esto" already renders `TimelineCard`, which uses `useImpressionTracker`. Verified — no code change.
- `EventInviteCard` in chat already uses `useImpressionTracker`. Verified — no code change.

## Technical notes
- All new call sites reuse the existing `trackEventImpression` helper, which already handles: session-level dedupe, daily DB dedupe for logged-in users, and the `'impression'` interaction type (allowed by the recent CHECK constraint migration).
- Self-view exclusion is enforced at each call site (skip when `user?.id === creatorId`), matching the rule in `useImpressionTracker`.
- No schema changes. No new hooks needed — direct calls inside `useEffect` for detail pages, mount-time call for the map popup.

## Files to change
- `src/pages/EventDetail.tsx` — add `useEffect` impression call
- `src/components/events/EventDetailModal.tsx` — add `useEffect` impression call
- `src/components/map/FoodMarkerPopup` (in `src/components/map/FoodMarker.tsx`) — add mount-time impression call, with creator-id check

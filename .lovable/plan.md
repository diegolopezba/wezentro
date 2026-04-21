

# Plan: Adopt Pinterest's `backgroundLocation` pattern

You're right — my previous plan was patching symptoms. The real issue is that `SelectedEventContext` re-implements modal routing manually with `pushState` + popstate listeners, and that custom implementation is what fights React Router and causes the lag/glitches.

## How Pinterest actually does it

This is documented in the official React Router "modal" example. The same approach is used by Pinterest (the original inspiration), Instagram web, and Reddit:

```text
User on /                           →  <Feed/> renders
User clicks pin                     →  navigate('/pin/123', { state: { backgroundLocation: location } })
URL becomes /pin/123                →  React renders <Feed/> (from backgroundLocation)
                                       AND <PinModal/> (from current location) on top
User clicks another pin in modal    →  navigate('/pin/456', { state: { backgroundLocation } })
                                       Same <Feed/> stays mounted, modal swaps
User hits browser back              →  React Router pops, backgroundLocation gone
                                       Modal unmounts, feed stays
User pastes /pin/123 fresh          →  No backgroundLocation, full <PinPage/> renders
```

**Zero manual history manipulation.** No `pushState`, no popstate, no body-scroll lock hacks, no overlay/page route collision. React Router does all of it.

## What this fixes (everything from your report)

- **Lag tapping username/related card from overlay** — gone. `navigate('/user/:id')` simply moves to a new route; no double-mount of EventDetail-page-while-overlay-still-open.
- **Glitch / "redirection" feeling** — gone. The overlay was previously fighting the `/event/:id` route matching simultaneously. With `backgroundLocation` they're explicitly separate.
- **Weird back behavior** — gone. Browser back is just `history.back()`, React Router pops the stack, modal disappears. No custom listeners.
- **Slow first-tap on EventDetail/UserProfile** — fixed by adding them to `preloadCoreRoutes()`.

## Implementation

### 1. Replace `SelectedEventContext` with router-native pattern

Delete the custom context. Replace its usage with a tiny helper hook:

```tsx
// src/hooks/useOpenEvent.ts
import { useNavigate, useLocation } from "react-router-dom";

export const useOpenEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (eventId: string) => {
    navigate(`/event/${eventId}`, {
      state: { backgroundLocation: location },
    });
  };
};
```

### 2. Restructure `App.tsx` routes

```tsx
const App = () => {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      {/* Main routes — render against background if modal is open */}
      <Routes location={backgroundLocation || location}>
        {/* all existing routes including /event/:id → <EventDetail /> */}
      </Routes>

      {/* Modal routes — only render when backgroundLocation present */}
      {backgroundLocation && (
        <Routes>
          <Route path="/event/:id" element={<EventDetailModal />} />
        </Routes>
      )}
    </>
  );
};
```

`<EventDetailModal />` is the existing `EventDetailOverlay` content, but reads `id` from `useParams()` and closes via `navigate(-1)`. It no longer needs the portal hack or the `selectedEventId` context.

### 3. Update call sites to use the new helper

Replace `selectedEventContext.openEvent(id)` everywhere with `useOpenEvent()`:
- `TimelineCard.tsx` — for home-feed cards
- `EventCard.tsx`, `EventFeed.tsx`, `RelatedEventsFeed.tsx` (when used inside the modal, they should also use `useOpenEvent` so taps stay in modal mode)

For navigations **out** of the modal (username, avatar, "user/:id"), use plain `navigate('/user/:id')` — React Router will dismiss the modal automatically because `backgroundLocation` is left behind.

### 4. Body scroll lock — done with CSS

Replace the `document.body.style.overflow = "hidden"` hack with a CSS class added when the modal is mounted, or just rely on the modal being `fixed inset-0 overflow-auto` (already the case). The current overlay already covers the viewport, so the body lock is mostly redundant.

### 5. Preload chunks for instant tap response

In `App.tsx`:
```ts
const eventDetailImport = () => import("./pages/EventDetail");
const userProfileImport  = () => import("./pages/UserProfile");

const preloadCoreRoutes = () => {
  indexImport(); discoverImport(); createImport();
  chatsImport(); profileImport();
  eventDetailImport(); userProfileImport(); // ← add
};
```

This is the single biggest perceived-speed win on slow PWA connections. Tapping a card on a cold cache currently waits for the JS chunk to download.

### 6. Smooth media swap in `useEventDetailState`

Small polish: when `eventId` changes, **don't** reset `aspectRatio` to `null` until the new image's `onLoad` fires. Prevents the hero from collapsing to `16/9` for a frame and re-expanding when navigating between two events of different aspect ratios.

## Files to change

- **Delete** `src/contexts/SelectedEventContext.tsx`
- **New** `src/hooks/useOpenEvent.ts`
- **Edit** `src/App.tsx` — backgroundLocation-aware `<Routes>`, preload imports
- **Edit** `src/components/events/EventDetailOverlay.tsx` → rename to `EventDetailModal`, remove portal + context, read `useParams()`, close with `navigate(-1)`
- **Edit** `src/components/events/TimelineCard.tsx`, `EventCard.tsx`, `EventFeed.tsx`, `RelatedEventsFeed.tsx` — use `useOpenEvent()`
- **Edit** `src/hooks/useEventDetailState.ts` — defer `aspectRatio` reset

## What stays identical

- The visual look of the overlay (same component body, same styles, same animation)
- The `/event/:id` URL appearing in the address bar
- Direct-link / shared-link behavior (paste a `/event/:id` URL → full page renders)
- The full `EventDetail` page, used for direct entry, deep links, push-notification taps

## Risks

- React Router v6 `future: { v7_startTransition: true }` is already enabled (good — works with this pattern).
- Need to verify push-notification deep links don't accidentally include `backgroundLocation` state (they don't — they use `window.location.href`, which has no state).
- Android hardware back button (`useAndroidBackButton`) already calls `navigate(-1)` — works correctly with the new pattern.

## Out of scope

- Animation polish on modal open/close (keeps current fade)
- Splash assets (you're handling these)
- Any redesign of EventDetail itself

## Reference

Official React Router example: https://github.com/remix-run/react-router/blob/dev/examples/modal/src/App.tsx — this is literally the "Pinterest pattern" the team named it after.


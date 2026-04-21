

# Plan: Fix scroll-glitch & white-screen crash (Pinterest/Instagram-aligned)

## Bug 1 — Modal opens "already scrolled down"

**Cause:** The modal is one `<m.div fixed inset-0 overflow-auto>` mounted at `/event/:id`. Tapping a "Más como esto" card only changes the `:id` param — React keeps the same DOM node and its scroll position is preserved.

**Fix:** Reset scroll synchronously before paint when `id` changes.

```tsx
const scrollRef = useRef<HTMLDivElement>(null);
useLayoutEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = 0;
}, [id]);
```

`useLayoutEffect` (not `useEffect`) is the canonical React Router fix and what Pinterest's closeup view does on pin-to-pin nav.

## Bug 2 — White screen / forced reload after open-close-open

**Cause:** Two things compound:
1. The modal's `document.body.style.overflow = "hidden"` effect races on rapid open/close in iOS PWA, leaving the body in an inconsistent state and throwing.
2. The throw bubbles to the **global** `ErrorBoundary`, which blanks the whole app. Then `lazyWithRetry` triggers `window.location.reload()`.

**Fix:**
1. **Drop the body-scroll lock entirely.** The modal is `fixed inset-0` covering the full viewport — background scroll is invisible. Pinterest mobile web does this; no lock, no race.
2. **Wrap the modal in a local `ModalErrorBoundary`** that calls `navigate(-1)` on error and shows a small toast. A failure inside one event view dismisses the modal back to the feed instead of blanking the app.
3. **Make global `ErrorBoundary` iOS-PWA safe:** force-reset `document.body.style.overflow = ""` in `componentDidCatch` so the "Recargar" button is always reachable.

## Files to change

- `src/components/events/EventDetailModal.tsx` — add `useLayoutEffect` scroll-to-top; remove inline body-lock; wrap tree in `ModalErrorBoundary`.
- `src/pages/EventDetail.tsx` — same `useLayoutEffect` scroll-to-top on `id` change (defensive for deep links).
- `src/components/events/ModalErrorBoundary.tsx` *(new, ~30 lines)* — class boundary with `onError` callback.
- `src/components/ErrorBoundary.tsx` — force-reset body overflow in `componentDidCatch`.

## What stays identical

- Pinterest `backgroundLocation` routing.
- Chunk preload of `EventDetail`/`UserProfile`.
- All animations, styles, aspect-ratio persistence.
- `lazyWithRetry`'s one-time auto-reload safety net.

## Out of scope

- Refactoring `EventDetail` page and `EventDetailModal` into one shared component.
- Diagnosing iOS PWA chunk-eviction (separate issue).


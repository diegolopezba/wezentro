## The bug

`EventFeed.tsx` assigns each card an inline `zIndex={events.length - index}`. With ~50–200 cards in the feed, cards get `z-index: 50, 51, … 200+`.

Their parent (the masonry `<div>` with `position: relative`) has no `z-index` and no `isolation`, so it does **not** create a new stacking context. The card z-indexes leak up to the root and compete directly with:

- `EventDetailModal` — `fixed inset-0 z-50`
- `BottomNav` — `fixed bottom-0 z-50`
- `Index` header — `sticky z-40`

Result: top cards (z ≥ 50) paint on top of the modal and nav. Exactly what you're seeing — modal opens, feed and nav stay visible above it, you can even scroll the feed through the overlay.

## How Instagram / Pinterest handle this

Both isolate every feed tile inside a container that owns its own stacking context (Pinterest uses an `isolation: isolate` wrapper around the masonry grid; Instagram portals overlays to `document.body` at a fixed top tier — `z-index: 1000+` for modals, `100` for the tab bar). Cards never compete with chrome because they're trapped inside a child stacking context, and overlays live on a documented z-scale.

We'll do the same — minimal, no behavior change.

## Plan

### 1. Trap card z-indexes inside the masonry grid
`src/components/events/EventFeed.tsx` — on the masonry container (`MasonryGrid`'s outer `<div>`), add `isolation: isolate` (or `zIndex: 0, position: relative` which we already have). This creates a stacking context, so card `zIndex` values (1…N) are scoped to the grid and can never exceed the parent's `z-index: auto` against siblings like the modal/nav.

### 2. Adopt a clear app-wide z-scale
Define and apply one tier system, matching Instagram's pattern:

```
content / cards         : auto (scoped inside grid)
sticky page headers     : 30
bottom nav              : 40
sheets / dropdowns      : 50  (shadcn default)
full-screen modals      : 60  (EventDetailModal, AuthPromptModal, etc.)
toasts                  : 70  (already handled by sonner)
```

- `src/components/events/EventDetailModal.tsx`: `z-50` → `z-[60]`
- `src/components/layout/BottomNav.tsx`: keep `z-50` → drop to `z-40` so the modal cleanly covers it
- `src/pages/Index.tsx` header: `z-40` → `z-30` (still above feed content; below nav, which is the existing visual order)

### 3. Verify
Use Playwright against `http://localhost:8080`:
1. Sign in (managed session injected), land on `/`.
2. Scroll feed ~3 screens, click a card → assert modal `[role]` visible, screenshot.
3. Read computed `z-index` for `BottomNav`, modal, and the highest-z card → confirm modal > nav > cards.
4. Repeat from `/user/:id` profile grid (same masonry) to confirm `TimelineCard` taps don't show the same leak.

### Files touched
- `src/components/events/EventFeed.tsx` (add `isolation: isolate`)
- `src/components/events/EventDetailModal.tsx` (bump to z-60)
- `src/components/layout/BottomNav.tsx` (drop to z-40)
- `src/pages/Index.tsx` (drop sticky header to z-30)

No business logic, no data, no router changes.

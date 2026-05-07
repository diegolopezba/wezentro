## Goal

Match Pinterest's mobile pin layout: hero media is full-bleed at the top and sides but has rounded bottom corners, with no gradient fade. Content sits cleanly below on the solid background.

## Changes

### 1. `src/pages/EventDetail.tsx`
- Remove the bottom gradient overlay: delete the `<div className="absolute bottom-0 ... bg-gradient-to-t from-background to-transparent ..." />` element (line ~132).
- Add rounded bottom corners to the hero wrapper: change `<div className="relative w-full">` → `<div className="relative w-full overflow-hidden rounded-b-3xl">`.
- Remove the negative-margin overlap on the content block: change `relative -mt-8 px-4 pt-2 pb-28` → `relative px-4 pt-4 pb-28` so the title and action row sit cleanly below the hero with no overlap.

### 2. `src/components/events/EventDetailModal.tsx`
- Apply the same three changes (remove gradient, add `rounded-b-3xl` on the hero wrapper, drop the negative top margin) so the sheet variant matches.

### 3. `src/components/events/MediaCarousel.tsx`
- No structural change needed. The `isHero` branch currently forces no rounding; the parent wrapper handles `rounded-b-3xl` via `overflow-hidden`, so the carousel will be clipped correctly.

## Out of scope
- No data, query, or business-logic changes.
- No changes to other pages or feed cards.

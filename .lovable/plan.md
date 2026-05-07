## Problem

On `/event/:id`, the action button row (like, repost, send, save, comments) appears too high and visually blends into the bottom gradient fade of the hero media. This regressed when the hero was migrated to `<MediaCarousel isHero />`.

## Root Cause

In `src/pages/EventDetail.tsx`:

- The content block uses `className="relative -mt-16 px-4 pb-28"` to pull the title/category up over the hero gradient fade (a deliberate Pinterest-style overlap).
- Previously, the hero `<img>`/`<video>` rendered with its natural intrinsic height plus the gradient sat at the bottom 20%.
- The new `MediaCarousel` (in `isHero` mode) sets `maxHeight: 70vh` and a `minHeight: 250px` and applies the same 20% bottom gradient (`h-[20%] bg-gradient-to-t from-background`). Because the carousel container is now often shorter (especially for square/portrait media on a 390px viewport, capped at 70vh), the `-mt-16` pulls the title further up into the gradient zone — which means the **action row** (which sits in the same `space-y-6` stack right below the title) lands inside/just under the gradient fade instead of cleanly on the solid background.

## Fix (single file, presentation only)

Edit `src/pages/EventDetail.tsx`:

1. Reduce/remove the negative top margin overlap on the content container so the title and action buttons sit cleanly below the hero gradient.
   - Change `relative -mt-16 px-4 pb-28` → `relative -mt-8 px-4 pt-2 pb-28` (keeps a subtle Pinterest-like lift for the category/title without dragging the action row into the gradient).
2. Add a small top margin/padding separator between the title block and the action buttons so the row clearly separates from the hero fade.
   - Inside the `space-y-6` `<m.div>`, wrap the action-buttons `<div className="flex items-center justify-between">` (line 169) with an extra `pt-1` or move it after a thin divider — keeping the existing gap consistent with `EventDetailModal`.

## Verification

- Reload `/event/4c9c0c16-020a-4241-9fd0-418f8d9e3167` and confirm the action row sits on the solid background, no longer overlapping the gradient fade.
- Cross-check `EventDetailModal` (sheet variant) to make sure spacing still matches; if the modal had the same regression, apply the same `-mt-*` adjustment there.
- Test with both a portrait (3/4) post and a landscape (16/9) event to ensure the spacing holds across aspect ratios.

## Out of Scope

- No changes to MediaCarousel itself, no changes to data/queries, no changes to other pages.

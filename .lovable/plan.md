## Problem

On the event detail page, portrait videos/images show a solid black bar on the right edge instead of the blurred backdrop filling the full width. This happens because `MediaCarousel` (hero mode) sets `aspectRatio` to the media's natural ratio AND caps height at `70vh`. For tall media the height cap kicks in, the container ends up narrower than the viewport, and the page background bleeds through on the right.

## Fix

Restructure the hero layout in `src/components/events/MediaCarousel.tsx` so the outer container is **always full-viewport-width**, with the blurred backdrop spanning the full width, and the contained media (`object-contain`) centered inside it within a height cap.

### Changes to `MediaCarousel.tsx` (hero mode only — feed cards untouched)

1. **Outer container (hero)**: width 100%, no aspect ratio. Height = `min(100vw / heroRatio, 70vh)` where `heroRatio` is the first item's aspect ratio (fallback 16/9). `minHeight: 250px`. This guarantees the box always spans full width and never overflows 70vh.
2. **Blurred backdrop**: keep `absolute inset-0` — now visibly fills the full width because the container is full width.
3. **Video/img element**: stays `w-full h-full object-contain`; letterboxing now appears over the blur instead of over page background.
4. **Aspect detection**: still update `aspectRatio` state on first media load so the height recomputes once natural dimensions are known.

### What stays the same

- Feed (`isHero=false`) container, mute button positions, coordinator wiring, sound logic — untouched.
- `EventDetail.tsx` — no changes; the outer `rounded-b-3xl` wrapper already spans full width.

## Verification

- Open a portrait-video event: no black bar on the right; blurred backdrop fills the sides.
- Open a landscape-image event: hero displays edge-to-edge with normal 16/9-ish framing.
- Feed cards (Home, Discover): no visual change.

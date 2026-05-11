## Change

**File:** `src/components/events/MediaCarousel.tsx` (isHero branch of `containerStyle`)

- Set `maxHeight: "80vh"` (currently `100vh`).
- Keep `minHeight: "250px"` and natural `aspectRatio`.
- Keep `object-cover` on `<img>`/`<video>`.

## Result

- Landscape, square, 4:5, 3:4 portraits → render at full natural ratio, no crop.
- 9:16 portraits → cap kicks in, ~3-5% trimmed from top/bottom (vertical, not the side-cropping that triggered the original bug).
- Hero never exceeds 80% of the viewport, so title and floating CTA stay near the fold.

## Restore old hero behavior

Revert the hero to its pre-carousel look: media fills the screen edge-to-edge using `object-cover`. Tall portrait videos get cropped top/bottom, but there are no side bars and no blurred backdrop.

### Changes to `src/components/events/MediaCarousel.tsx` (hero mode only)

1. **Container**: full-width, fixed aspect ratio of `3/4` (same as feed cards used to be), `minHeight: 250px`, `maxHeight: 70vh`. No dynamic height from natural aspect ratio.
2. **Media element**: switch hero from `object-contain` back to `object-cover` so it fills the container, cropping overflow.
3. **Remove the blurred backdrop** in hero (the `absolute inset-0 bg-cover ...` div) — no longer needed and never worked for videos anyway.
4. **Aspect-ratio detection on first media load** is no longer needed for the hero; leave the state in place since feed cards still use it.

### Untouched

- Feed (`isHero=false`) container and behavior.
- Mute button position/styling.
- Video coordinator wiring and audio rules.
- `EventDetail.tsx`.

### Verification

- Portrait video event: hero fills full width, cropped top/bottom, no black side bars.
- Landscape image event: hero fills full width in 3/4 box, cropped left/right as needed.
- Feed cards unchanged.

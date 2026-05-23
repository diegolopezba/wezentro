## Goal

On the event details page, the hero media currently uses a fixed 3:4 portrait container, which crops/zooms horizontal (panoramic) images and videos. Restore the old behavior: container height adapts to the media's natural aspect ratio, with sensible bounds — no cropping, no black/blurred bars.

## Change (single file: `src/components/events/MediaCarousel.tsx`)

The component already detects the first item's natural aspect ratio (`handleImageLoad` / `handleVideoMetadata`) and stores it in `aspectRatio` state. It's just ignored in the hero `containerStyle`. Update the hero branch to use it:

- Use the detected `aspectRatio` (fallback to `3/4` while loading, so layout doesn't jump for the common portrait case).
- Clamp height with CSS bounds so extreme media stays reasonable:
  - `minHeight: 250px` (unchanged)
  - `maxHeight: 70vh` (unchanged — prevents very tall portraits from dominating the screen)
  - For panoramic media, the computed aspect-ratio height will naturally be short; that's fine and matches the pre-carousel feel. We can add a `minHeight` floor (already 250px) so ultra-wide media still has presence.
- Width stays `100%`.

For multi-item carousels where slides have different aspect ratios, the container locks to the first slide's ratio (same as the old single-media behavior and what the feed cards do). Subsequent slides use `object-cover` within that box — acceptable since the user is opting in by swiping.

## Out of scope

- Feed card sizing (unchanged).
- Header/back-button layout (unchanged).
- Any business logic.

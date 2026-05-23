## Problem
On feed cards, tapping the mute/unmute button toggles audio but also opens the event details page.

## Cause
`MediaCarousel` detects taps via `onPointerDown`/`onPointerUp` on its container (to call `onTap`). The mute button only stops propagation on `onClick`, which fires after pointer events — so the container still records the tap and opens details.

## Fix
In `src/components/events/MediaCarousel.tsx`, add `onPointerDown` and `onPointerUp` handlers to the mute `<button>` that call `e.stopPropagation()`, preventing the carousel container from registering the tap.

One-file, presentation-only change. No behavior changes to hero, coordinator, or details page.

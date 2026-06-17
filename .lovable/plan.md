# Fix: Card overlap flash on append

## Problem
New cards briefly overlap neighbors during the single paint between mount (estimated height) and first measurement (real height).

## Fix: 1-frame visibility gate

### `src/hooks/useMasonryLayout.ts`
- Expose `isMeasured(id: string): boolean` from the hook, backed by the existing `measuredHeights` ref/map.
- No change to placement math — unmeasured items still reserve a slot in `colHeights` using the estimated height, so cards below don't collapse upward.

### `src/components/events/EventFeed.tsx`
- On each absolutely-positioned card wrapper, set `visibility: isMeasured(item.id) ? 'visible' : 'hidden'`.
- Keep the wrapper mounted with its estimated `top`/`left`/`width` so the ref callback can measure it.
- Already-measured cards (everything above the newest batch) are untouched — no remount, no video replay, no animation replay.

## Why this is invisible
- React mounts card → ref callback measures synchronously → next RAF re-runs layout with real height → card flips to `visible` at correct position.
- Total hidden duration: ~1 frame (~16ms), below perceptual threshold.
- Slot is reserved during that frame, so layout below doesn't jump.

## Verification
- `browser--screenshot` on mobile 390×844 and tablet 768×1024.
- Scroll through 3+ pages of appended cards; confirm no overlap flash.
- Confirm last row still clears `BottomNav` and videos in measured cards don't remount on append.

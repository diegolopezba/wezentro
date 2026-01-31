
# Update Saved Events Page to Masonry Layout

## Overview
Change the Saved Events page from a vertical stack layout to a masonry (staggered) grid layout to match the visual style used throughout the rest of the app.

## Current State
- Events are displayed in a single column vertical stack using `space-y-4`
- Loading skeleton shows full-width rectangles
- Individual motion wrappers around each card

## Changes Required

### 1. Update Event Grid Container
Replace the vertical stack layout with the masonry grid:
- Change `className="space-y-4"` to `className="masonry-grid"` on the events container
- Remove individual `motion.div` wrappers since EventCard handles its own animations

### 2. Update Loading Skeleton
Replace the full-width skeleton rectangles with the `EventFeedSkeleton` component which already uses the masonry layout.

### 3. Pass Index Prop
Ensure the `index` prop is passed to each EventCard for proper staggered animation timing.

---

## Technical Details

**File to modify:** `src/pages/Saved.tsx`

**Key changes:**
```text
1. Import EventFeedSkeleton from "@/components/skeletons"
2. Replace loading skeleton with <EventFeedSkeleton count={6} />
3. Change events container from space-y-4 to masonry-grid
4. Remove motion.div wrappers, pass index to EventCard
```

The masonry-grid CSS class is already defined in `index.css` and creates a 2-column grid on mobile, 3 columns on tablet, and 4 columns on desktop.

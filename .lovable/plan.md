

## Fix: Restore Masonry Layout with Virtualization

**Problem**: The virtualizer groups cards into rows of 2, forcing both cards in a row to share the same height. This removes the staggered/offset masonry effect where cards in each column flow independently based on their content height.

**Solution**: Switch from row-based virtualization to a simple CSS columns masonry layout with a windowed rendering approach. Since the cards are lightweight (just an image + text), we can safely render all cards with CSS masonry and rely on native `loading="lazy"` on images + the existing IntersectionObserver for performance — this handles 200 cards fine on modern devices.

### Changes in `src/components/events/EventFeed.tsx`:

1. Remove the `useVirtualizer` and `buildMasonryRows` logic
2. Restore the original CSS-based masonry layout using `columns-2` (CSS multi-column) or the original `grid grid-cols-2` with `break-inside-avoid` for true masonry
3. Keep the `useDwellTimeTracker` and sponsored impression tracking unchanged
4. Add `loading="lazy"` to EventCard images as a performance optimization (Priority 2 item from the plan)

This restores the exact visual layout you had before while still benefiting from all the other performance improvements (prefetching, server-side trending, indexes, auth fix).


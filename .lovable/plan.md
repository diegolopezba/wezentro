# Pinterest-Style Masonry for the Feed

Replace the current CSS `column-count` masonry (which rebalances and re-mounts cards on every page append — the cause of the right-column glitch) with **absolute-positioned JS masonry**, the same technique Pinterest's open-source `gestalt` Masonry component uses.

## How Pinterest actually does it (verified pattern)

Pinterest's Masonry (`gestalt/packages/gestalt/src/Masonry`) works like this:

1. Container is `position: relative` with an explicit pixel `height` equal to the tallest column.
2. Every item is `position: absolute` with computed `top` and `left`.
3. Layout walks items **in array order**. For each item, it picks the column with the smallest current `height`, places the item at `{ top: colHeight, left: colIndex * (colWidth + gap) }`, then adds the item's height to that column.
4. On append (infinite scroll): only the new items get positions computed; existing items' `top`/`left` never change → no reflow, no repaint, no `<video>` re-init, no animation replay.
5. Item heights come from either (a) a known `aspectRatio` from the data, or (b) measurement after first mount, cached by item id.
6. A `ResizeObserver` on the container recomputes positions only when container width changes (rotation, resize).

This gives true top-to-bottom, left-to-right reading order: item 0 → top-left, item 1 → top of next column (or below item 0 if it's shorter), item 2 → next shortest column, etc. Ads injected at index 1 and interval 9 land at deterministic visual rows.

## Files to change

### 1. New: `src/hooks/useMasonryLayout.ts`

A single hook that owns layout math. Inputs: `items: { id, aspectRatio? }[]`, `containerWidth`, `columnCount`, `gap`. Outputs: `positions: Map<id, { top, left, width, height }>`, `containerHeight`, `measureRef(id)` callback for late height correction.

Behavior:
- Computes `columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount`.
- For each item in order: estimated height = `columnWidth / aspectRatio` (default `aspectRatio = 0.8` → portrait, matches current card feel). Place in shortest column, append height + gap.
- `containerHeight = max(columnHeights)`.
- After mount, `measureRef` reads real DOM height; if it differs from estimate by > 2px, store the real height in a ref keyed by item id and re-run layout for items at that index and after (existing items above stay put because their heights are already known).
- Memoize by `[items, containerWidth, columnCount]`. Incremental: keep `lastLaidOutIndex`; on append, resume from there using cached column heights.

### 2. `src/components/events/EventFeed.tsx`

- Wrap grid in a `<div ref={containerRef} style={{ position: 'relative', height: containerHeight }}>`.
- `useResizeObserver` (or a small inline one) to track `containerRef.current.clientWidth`.
- `columnCount`: 2 below 640px, 3 at 640–1024, 4 above 1024 (same breakpoints as today's CSS).
- Pass `events` (with `aspectRatio` derived from first media item — fall back to 0.8) into `useMasonryLayout`.
- Render each event inside a `<div style={{ position: 'absolute', top, left, width }}>` wrapper. Apply `observeCard` ref and `data-event-id` on this wrapper (preserves dwell tracking).
- Keep the dedicated `<div ref={sentinelRef}>` after the container — unchanged behavior.

### 3. `src/components/events/EventCard.tsx`

- Remove `masonry-item` class from the root `<div>` (width/margin now come from the absolute wrapper).
- Otherwise unchanged. The `memo` comparator and `useImpressionTracker` stay as-is.

### 4. `src/index.css`

- Delete the `.masonry-grid` (column-count), `@media` column rules, and `.masonry-item` rules.
- That's it — no replacement CSS needed; positioning is inline style on the absolute wrappers.

## Edge cases handled

- **Late media height correction**: estimate uses `aspectRatio` so first paint is correct for items whose ratio we know. For items without a ratio, estimate at 0.8 and let `measureRef` correct after mount — only items at or below that index shift, never above.
- **Viewport rotation / resize**: `ResizeObserver` recomputes from index 0 with the new `columnWidth`. Existing height cache stays valid (height was measured per column width — invalidate cache when width changes).
- **Append (infinite scroll)**: new items resume from cached column heights → O(new items), not O(all items). Existing wrappers' inline `top`/`left` are unchanged → React reconciliation does nothing → no DOM mutation, no repaint.
- **Ad slots at index 1 and interval 9**: placement is by array index, so ads land at predictable visual rows (top of column 2 for index 1 on mobile, etc.). Matches the existing sponsored-post delivery contract.
- **`feed-card-enter` animation**: keep on first paint; absolute positioning doesn't break it.

## Out of scope

- No new dependencies (no `react-masonry-css`, no `gestalt`). ~120 lines of hook code total.
- No changes to scoring, slate assembly, sponsored-post delivery, dwell tracking, or `useForYouEvents`.
- No virtualization — the existing 200-item cap keeps DOM size bounded.
- `RelatedEventsFeed` and any other grid using `.masonry-grid` will be migrated in a follow-up if needed (will check during build; if it uses the same CSS classes, the same hook can be applied — but only if you confirm).

## Verification

- Load `/` on 390×677 mobile viewport. Confirm: item 0 top-left, item 1 top of column 2.
- Scroll to trigger `onEndReached`. Confirm: existing cards' `top`/`left` inline styles do NOT change in DevTools; new cards appear at the bottom of whichever column is shorter.
- Confirm right-column videos no longer re-init / flicker on append.
- Rotate / resize to ≥640px width. Confirm layout reflows to 3 columns and reading order is preserved.

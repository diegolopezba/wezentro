

## Make map event card match media dimensions

When tapping a dot on the map, the popup event card currently renders with EventCard's default `3/4` aspect ratio and `maxHeight: 350px`. The card should instead size itself to the natural dimensions of its image/video, constrained to reasonable bounds for the map context.

### Approach

**File: `src/components/events/EventCard.tsx`**

1. Add an optional `compact` prop to `EventCardProps`
2. When `compact` is true:
   - Remove `maxHeight: 350px` constraint so the card height follows the media's natural aspect ratio
   - Remove the entry animation (`initial`/`animate` on `motion.div`) since the parent in Discover already animates the card in
   - Keep `minHeight` small (e.g. 80px) as a safety net

**File: `src/pages/Discover.tsx`**

3. Pass `compact` to the `EventCard` in both the single-event and carousel renders inside the map popup

This is a lightweight change — just one new boolean prop that relaxes height constraints, letting the card naturally match its media.


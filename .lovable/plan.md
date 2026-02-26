
## Plan: Related Content Infinite Scroll in Event Detail

### The Idea
When a user opens an event or post detail, instead of just showing the single event and requiring them to close it, we add a **"More like this"** section below the event content. Users can keep scrolling to discover related content — clicking any related item replaces the current detail with that new item's detail (swapping the `selectedEventId`), so the URL updates and the user stays in the immersive fullscreen flow. This mirrors Instagram's "More posts from @user" / Pinterest's "More ideas" pattern.

### How Related Content Works
We fetch up to 12 events/posts that match the current event's:
1. **Same category** (highest weight)
2. **Same creator** (shows more from this person)
3. **Recent** (last 30 days)
4. Exclude the current event itself

This is a simple client-side filter on the already-fetched feed data — no extra DB query needed for most cases. But for direct-link visits (no feed cache), we add a small targeted query.

### Files to Create/Modify

**New: `src/hooks/useRelatedEvents.ts`**
- Takes `eventId`, `category`, `creatorId`
- Queries up to 12 public events matching category OR same creator
- Excludes the current event

**Modify: `src/components/events/EventDetailOverlay.tsx`**
- Below the existing content (after the guestlist/CTA section), add a `RelatedEventsFeed` section
- Title: "Más como esto" 
- Renders a masonry grid of `TimelineCard` items
- Clicking a related card calls `openEvent(id)` — replacing the current selected event (no close needed)
- Add a thin separator and section header before the grid

**Modify: `src/pages/EventDetail.tsx`** (direct link / non-overlay version)
- Same treatment: add related events below the main content

### UX Details
- Section appears after main event content, below the floating CTA bar area
- Uses existing `TimelineCard` component — no new card design needed
- Related items open in the same overlay (swap `selectedEventId`) — seamless
- On the direct-link page (`/event/:id`), clicking a related item navigates to that event's page
- Loading state: show 4 skeleton cards while fetching
- Empty state: section simply doesn't render (no empty message)
- The overlay already scrolls (`overflow-auto`) so no layout changes needed

### What Changes
1. **New hook** `useRelatedEvents(eventId, category, creatorId)` — targeted DB query for related content
2. **New component** `src/components/events/RelatedEventsFeed.tsx` — renders the grid with heading
3. **EventDetailOverlay.tsx** — import and render `<RelatedEventsFeed>` at the bottom of the content area
4. **EventDetail.tsx** — same addition for direct-link visitors

### No Risk
- Additive change only — doesn't touch existing event detail logic
- Related feed is below the fold, doesn't affect current UX
- If query returns 0 results, component returns null

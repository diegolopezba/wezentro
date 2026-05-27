## Changes

### 1. Remove background of 3-dot menu (top right)
**File:** `src/components/events/EventCard.tsx`

The 3-dot button currently has `backdrop-blur-sm` + `bg-transparent`. Remove the `backdrop-blur-sm` class so only the icon shows (no blur background). Keep position, tap target, and stopPropagation behavior intact.

### 2. Add minimal like button (bottom left of card)
A small heart icon overlaid on the bottom-left of the media, mirroring the existing view-count pill style (`absolute bottom-2 left-2`, subtle black/30 backdrop or fully transparent — going **fully transparent** to match the minimal/clean direction of the 3-dot change).

**New component:** `src/components/events/CardLikeButton.tsx`
- Props: `eventId: string`
- Uses `useIsEventLiked`, `useEventLikes`, `useLikeEvent`, `useUnlikeEvent` (already exist).
- Renders a `Heart` icon (lucide) — filled red (`fill-primary text-primary`) when liked, outline white when not.
- Beside it: like count via `formatCount`, hidden when 0.
- `onClick` calls `e.stopPropagation()` then toggles like/unlike. Triggers haptic (already inside the mutation hook).
- Guests: tap shows `useAuthPrompt` modal (consistent with rest of app).
- Styling: `text-[11px] font-medium text-white leading-none`, drop-shadow for legibility against any media. No pill background — pure icon + number.

**Integrate into:**
- `src/components/events/EventCard.tsx` — inside the `<MediaCarousel>` wrapper div, absolute bottom-2 left-2, z-10.
- `src/components/events/TimelineCard.tsx` — same placement, so profile/timeline cards also get the like control.

### Technical notes
- Reuses existing `event_likes` table + hooks; no DB changes.
- Optimistic updates and haptics already handled in the like/unlike mutations.
- `stopPropagation` on the button prevents the card's `openEvent` from firing when liking.
- Heart fill uses semantic token `--primary` (Pinterest red, already the brand).

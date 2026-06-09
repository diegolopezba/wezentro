Add capacity display and sold-out state to event detail pages

## Summary
Show guestlist capacity (e.g. "15/100") next to the price in the floating CTA bar on event detail pages. When the guestlist is full, disable the join/buy button and show a disabled "Agotado" state instead.

## Files to change

### 1. src/hooks/useEventDetailState.ts
- Add derived state:
  - `approvedCount` = `guestlist.length`
  - `maxGuestlistCapacity` = `event?.max_guestlist_capacity`
  - `isGuestlistFull` = `maxGuestlistCapacity != null && approvedCount >= maxGuestlistCapacity`
- Export the three new values

### 2. src/pages/EventDetail.tsx
- Destructure `approvedCount`, `maxGuestlistCapacity`, `isGuestlistFull` from `useEventDetailState`
- In the floating CTA bar:
  - Show `{approvedCount}/{maxGuestlistCapacity}` next to `formattedPrice` when capacity is set
  - When `isGuestlistFull` and user is not owner and not already on guestlist, render a disabled `<Button variant="outline">Agotado</Button>` instead of the "Free"/"Comprar" button

### 3. src/components/events/EventDetailModal.tsx
- Same changes as `EventDetail.tsx` (identical CTA bar logic)
Update the floating action button on the event details page so that when an event is sold out, it reads "Entradas agotadas" and is disabled for users who have not purchased a ticket.

## Current behavior
- `useEventDetailState` already computes `allTiersSoldOut` for tier-based events and `isGuestlistFull` for capacity-based events.
- The floating CTA in `EventDetail.tsx` and `EventDetailModal.tsx` only checks `isGuestlistFull`, so tier-based sold-out events still show a clickable "Comprar" button.
- Free events that hit their guestlist capacity show "Agotado" instead of the requested "Entradas agotadas".

## Changes
1. `src/pages/EventDetail.tsx`
   - Destructure `allTiersSoldOut` from `useEventDetailState`.
   - In the floating CTA bar, combine `allTiersSoldOut || isGuestlistFull` into a single sold-out branch.
   - Render a disabled `<Button variant="outline">` with the text "Entradas agotadas".

2. `src/components/events/EventDetailModal.tsx`
   - Apply the same destructuring and CTA logic change.

## Out of scope
- Price label already shows "Agotado" via `formattedPrice`; no change needed there.
- Owners still see "Gestionar".
- Users who already joined still see "Ver entrada".

## Verification
- Build the app and open a sold-out event (all tiers capacity reached) as a non-owner, non-attendee user.
- Confirm the bottom-right button reads "Entradas agotadas" and is disabled.
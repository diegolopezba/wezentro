## Issue
`EventDetailModal.tsx` (the overlay shown when tapping a card from the feed) renders `event.location_name` without checking the secret-location gate, so a user who left the guestlist still sees the address there. The full-page `EventDetail.tsx` already gates correctly.

## Fix
In `src/components/events/EventDetailModal.tsx`:
1. Pull `isLocationSecret` and `canSeeLocation` from the existing `useEventDetailState` destructure (already available in the hook).
2. Replace the plain location block (around line 283) with the same gated UI used in `EventDetail.tsx`:
   - If `isLocationSecret && !canSeeLocation`: show the "Ubicación secreta — La verás cuando el organizador te apruebe." lock card.
   - Otherwise: show `location_name` with the `Secreta` chip when `isLocationSecret` is true.
3. Add the `Lock` icon import from `lucide-react`.

No backend or other file changes needed.
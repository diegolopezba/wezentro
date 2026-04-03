

## Remove Redundant Guestlist UI from Event Detail

### Rationale

The new "Personas que van" section already displays all approved attendees (with followed users prioritized). The old "Lista de invitados" section shows the exact same users in a less useful order. Removing it declutters the event detail page without losing any information.

The owner's "Gestionar" (Manage) button remains in the floating CTA bar, so guestlist management is unaffected.

### Changes

| File | Change |
|---|---|
| `src/pages/EventDetail.tsx` | Remove the entire "Lista de invitados" section (lines ~369-411) — the guestlist avatars, attendee list, and empty state |
| `src/components/events/EventDetailOverlay.tsx` | Same removal of the guestlist section |

### What stays
- "Personas que van" section (the new one with following priority)
- Owner's "Gestionar" button in the CTA bar
- `GuestlistManagementSheet` component (still accessible via the Gestionar button)
- All guestlist data fetching in `useEventDetailState` (still needed for management and status checks)

### What gets removed
- The "Lista de invitados (N)" header
- The duplicate avatar row
- The attendee list with join dates and message icons
- The empty state ("Nadie se ha unido aún")

This is a pure UI cleanup — no hooks, data, or backend changes needed.


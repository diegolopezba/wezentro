

## Remove "Invitar a la lista" Action Button

### Rationale

The guestlist is owner-managed only. The `UserPlus` button allowed approved attendees (and owners) to invite others via `ShareGuestlistModal`, but this conflicts with the owner-only management model. Owners already have the "Gestionar" button to manage their guestlist.

### Changes

| File | Change |
|---|---|
| `src/pages/EventDetail.tsx` | Remove the `UserPlus` button (~line 180) and the `ShareGuestlistModal` render (~line 402). Remove `UserPlus` import if unused. |
| `src/components/events/EventDetailOverlay.tsx` | Same removal of the button (~line 194-197) and modal (~line 364). |
| `src/hooks/useEventDetailState.ts` | Remove `showGuestlistInviteModal`, `setShowGuestlistInviteModal`, and `canInviteToGuestlist` from the hook's state and return value. |

### What stays
- Owner's "Gestionar" button and `GuestlistManagementSheet`
- `ShareGuestlistModal` component file itself (can be cleaned up later if unused elsewhere)
- The "Personas que van" section

Pure UI cleanup — no backend changes.


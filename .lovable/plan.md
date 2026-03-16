
## Reservation Button on Posts

### What we're building

Business accounts with reservations enabled can optionally show a **"Reservar" button** on their posts. When tapped, it opens the same `ReservationSheet` from the user profile — directly from the post detail view.

```
Create post (business with reservations on)   Event Detail (viewer side)
+------------------------------------+         +------------------------------------+
| [Toggle] Mostrar botón Reservar  ● |  --->   | ♥  ↺  ➤  🔖  |  📅 Reservar  ⋮  |
+------------------------------------+         +------------------------------------+
                                                              ↓ tap
                                               +--[ Reservation Sheet ]------------+
                                               |  Fecha → Hora → Personas → Extra  |
                                               +-----------------------------------+
```

### Condition for toggle visibility

The toggle shows in Create/Edit only when:
- `isBusiness === true` (from `profile.is_business`)
- `reservationsEnabled === true` (from `profile.reservations_enabled`)
- No menu items check needed — reservations are controlled by a profile switch, not content

### Changes needed

**1. Database migration**
- Add `show_reservation_button boolean DEFAULT false` to the `events` table.

**2. `src/hooks/useEventMutations.ts`**
- Add `show_reservation_button?: boolean` to `UpdateEventData` interface.

**3. `src/hooks/useEvents.ts`**
- Ensure `show_reservation_button` is included in the event select query / type (already auto-typed from DB).

**4. `src/pages/Create.tsx`**
- Add `showReservationButton: false` to `formData` state.
- After the menu button card, add a new card visible when `isBusiness && reservationsEnabled`.
- Pass `show_reservation_button: isBusiness && reservationsEnabled ? formData.showReservationButton : false` in the insert payload.
- Import `CalendarCheck` icon (already in project) and read `reservationsEnabled` from `profile` (same as UserProfile: `(profile as any)?.reservations_enabled !== false`).

**5. `src/components/events/EditEventSheet.tsx`**
- Add `show_reservation_button?: boolean | null` to event prop interface.
- Add `show_reservation_button` to `formData` state and `useEffect` reset.
- Add toggle card (same condition: `isBusiness && reservationsEnabled`).
- Include `show_reservation_button` in the `handleSave` payload.

**6. `src/components/events/EventDetailOverlay.tsx`**
- Add `showReservationSheet` state + import `ReservationSheet`.
- In the right-side action row, after the menu button, add: `event.show_reservation_button && event.creator_id` → show `CalendarCheck` + "Reservar" button.
- Render `<ReservationSheet>` at the bottom, passing `businessId={event.creator_id}` and fetching `businessName` from `event.creator?.username`.

**7. `src/pages/EventDetail.tsx`**
- Same changes as EventDetailOverlay: state, button, ReservationSheet render.

### Files to change

| File | Change |
|------|--------|
| New migration | Add `show_reservation_button` to `events` |
| `src/hooks/useEventMutations.ts` | Add field to interface |
| `src/pages/Create.tsx` | Add toggle card + insert field |
| `src/components/events/EditEventSheet.tsx` | Add toggle + save field |
| `src/components/events/EventDetailOverlay.tsx` | Button + ReservationSheet |
| `src/pages/EventDetail.tsx` | Button + ReservationSheet |

### Key UX decisions

- The "Reservar" button uses the same orange gradient styling as the profile page button, making it visually consistent
- Guests (unauthenticated) tapping the button get an auth prompt, same as the profile version
- The button only shows if `show_reservation_button === true` — no effect on non-business posts
- No new data is needed: `ReservationSheet` only needs `businessId` (= `creator_id`) and `businessName` (= `creator.username`)
- Toggle is hidden if the business has disabled reservations in their settings — checking `profile.reservations_enabled` on the creator's profile would require an extra query; instead we check the *posting* user's own profile, which is correct since only the creator can enable/disable this on their own posts


## Reservation Confirmation Page

Create a new page at `/reservation/:id` that shows a confirmation screen similar to the "You Are Going" (`/going/:id`) page, but tailored for reservations.

### What it shows
- Full-screen layout with the business's avatar/photo as background (or a gradient fallback)
- The user's name prominently displayed
- Business name and location
- Reservation date and time
- Party size
- Tagged guests with their avatars and usernames
- "Ver Menu" button that opens the existing MenuSheet for that business
- Notes (if any)
- Close button to go back

### Access points (3 entry points)
1. **After creating a reservation** -- the ReservationSheet's `onSuccess` callback navigates to `/reservation/{new_id}` instead of just closing
2. **From "Mis Reservas" page** -- tapping a ReservationCard navigates to `/reservation/{id}`
3. **From notifications** -- tapping a `reservation_tagged` or `new_reservation` notification navigates to `/reservation/{entity_id}`

### Technical Details

**New file: `src/pages/ReservationConfirmation.tsx`**
- Route param: `:id` (reservation ID)
- Fetches reservation data with business profile joined
- Fetches tagged guests via `reservation_guests` table with profile joins
- Uses the existing `MenuSheet` component for the menu button
- Layout mirrors `YouAreGoing.tsx`: full-screen, gradient overlay, bottom-aligned content with framer-motion animations
- Displays tagged guests as a row of avatars (tappable to navigate to their profiles)

**Modified: `src/App.tsx`**
- Add route: `/reservation/:id` as a ProtectedRoute with lazy-loaded `ReservationConfirmation`

**Modified: `src/components/reservations/ReservationSheet.tsx`**
- In `onSuccess`, navigate to `/reservation/${data.id}` using the returned reservation ID from `createMutation`
- Pass `useNavigate` and use it in the success callback

**Modified: `src/pages/MyReservations.tsx`**
- Make each `ReservationCard` clickable (whole card) to navigate to `/reservation/{id}`

**Modified: `src/pages/Notifications.tsx`**
- Add handling for `new_reservation` and `reservation_tagged` notification types in `handleNotificationClick` -- navigate to `/reservation/{entity_id}`
- Add a notification item renderer for reservation types (using business avatar, similar to existing patterns)

**Modified: `src/hooks/useReservations.ts`**
- Add a new hook `useReservationDetail(id)` that fetches a single reservation with business profile and tagged guests in one query

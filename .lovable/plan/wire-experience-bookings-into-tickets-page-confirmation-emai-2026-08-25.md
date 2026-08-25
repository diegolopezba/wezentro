# Wire experience bookings into tickets page + confirmation emails

## What I found

Two gaps, both confirmed in code:

1. **Reservas tab never reads experience bookings.** `src/components/tickets/ReservationsList.tsx` only queries the `reservations` (tables) table. A ready-made hook `useMyExperienceBookings` exists in `src/hooks/useExperiences.ts` but nothing uses it — so a confirmed experience booking is invisible in `/tickets`.
2. **No email is ever sent for experience bookings.** In `supabase/functions/qhantuy-callback/index.ts`, the experience branch confirms the booking and creates in-app notifications, then `return`s before the email dispatch. The reservation email system (`send-reservation-emails` + `reservation-confirmed`/`reservation-received` templates) only handles table reservations; there is no experience template.

Also missing (needed to actually "access" the booking): there is no detail/ticket view for an experience booking — `/reservation/:id` only loads table reservations, and the booking sheet's success step only has a "Listo" button.

## What to build

### 1. Experience bookings in the Reservas tab (`/tickets`)

- Extend `ReservationsList` to also fetch the user's experience bookings (own + tagged via `experience_booking_guests`), merge them chronologically into the existing Próximas / Pasadas sections.
- New `ExperienceBookingCard`: experience cover image, title, business name, segment name, date, time, quantity, amount (Bs.), status chips (Confirmada / Cancelada / Finalizada / Invitado), consistent with the existing reservation card style.
- Cancel action for upcoming bookings (respects `cancellation_window_hours`), calling the existing `set_experience_booking_status` function.

### 2. Booking detail / ticket view

- Extend `src/pages/ReservationConfirmation.tsx` (route `/reservation/:id`) to detect when the id is an experience booking and render an experience ticket instead: experience name/image, segment, date/time, quantity, and the check-in QR from the booking's `check_in_token`.
- Add a "Ver entrada" button to the booking sheet's success step that navigates to this page (matches the ticket purchase flow).
- Wire the QR scanner: `check-in-guest` accepts experience booking tokens so the business can validate entry, mirroring guestlist check-in.

### 3. Confirmation emails

- New template `experience-confirmed` (guest): experience name, business, segment, date/time, quantity, total paid, location note, link to the ticket. Plus a business copy ("Nueva reserva de experiencia") with guest name, segment, spots, and a link to the dashboard.
- Register in `registry.ts`; copy in Spanish, dates in America/La_Paz, amounts as `Bs.`, same as existing templates.
- Trigger from `qhantuy-callback` right after the booking is confirmed (service-role call, fire-and-forget like `send-purchase-tickets`): emails go to the buyer, each tagged guest, and the business owner.
- Reuse the same path for guest cancellations (guest cancels → business is emailed; business cancels → guest is emailed).

### 4. Verification

- Playwright smoke test: book an experience on the test account, confirm it appears in `/tickets` → Reservas, open the ticket, verify the QR renders, and confirm the email is enqueued (check the email queue table / function logs).

## Technical notes

- No schema changes needed — `experience_bookings`, `experience_booking_guests`, `check_in_token`, and `set_experience_booking_status` already exist; RLS already allows the booker and business to read rows.
- `send-reservation-emails` will gain an `experienceBookingId` mode (or a sibling function `send-experience-emails` if cleaner), authorized the same way: service role or a participant.
- Tagged guests will see the booking marked "Invitado", same as tagged table reservations.

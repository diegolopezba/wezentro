# Reservation confirmation emails

## What I found

No email is ever sent when a reservation is created. This is not a delivery failure:

- The booking runs entirely inside the database function `create_reservation`. It validates schedule, tables and pacing, inserts the row, and returns — it never enqueues an email or an in-app notification.
- The transactional email registry only contains three templates: `special-invite`, `invite-confirmed`, `tickets-purchased`. There is no reservation template.
- The only reservation-related messaging that exists is push reminders (24h / 2h) via `send-reservation-reminders`, which is separate and push-only.
- Email infrastructure itself is healthy: `hello.zentro.today` is verified and the queue sent mail in the last 7 days.

So both the guest and the restaurant got nothing because nothing was ever triggered.

## What to build

1. **Two new email templates**
   - `reservation-confirmed` (guest): venue name, date, time, party size, table/area if assigned, notes, address, and a link to the reservation detail.
   - `reservation-received` (business): guest name/username, party size, date/time, notes, link to the dashboard reservations tab.

2. **A `send-reservation-emails` edge function**
   - Input: `reservation_id`.
   - Loads the reservation, the guest profile, the business profile, and any tagged guests.
   - Resolves recipient addresses from auth users (service role), since profiles do not store email.
   - Enqueues through the existing transactional email pipeline (same pattern as `send-purchase-tickets`), so retries, suppression and unsubscribe handling all keep working.
   - Sends the guest email to the booker plus each tagged guest, and the business email to the venue owner.

3. **Trigger it from the client**
   - After `create_reservation` succeeds in `useCreateReservation`, invoke the function with the returned reservation id. Failure to send must not break the booking (fire-and-forget with logging).

4. **Cancellation email (small addition, same function)**
   - Reuse the flow on cancel so the other side is informed: if the guest cancels, notify the venue; if the venue cancels, notify the guest.

## Technical notes

- Templates go in `supabase/functions/_shared/transactional-email-templates/` and must be registered in `registry.ts`, matching the existing style of `tickets-purchased.tsx`.
- The new function uses `verify_jwt = true` and is added to `supabase/config.toml`.
- Sender domain stays `hello.zentro.today`; no DNS work is needed.
- Copy in Spanish, currency and dates formatted the same way as the rest of the app (America/La_Paz).

## Out of scope unless you want it

- In-app notifications for reservations (currently also missing).
- Modification emails when a reservation is edited.

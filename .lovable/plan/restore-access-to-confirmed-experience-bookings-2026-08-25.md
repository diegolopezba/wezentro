# Restore access to confirmed experience bookings

## Confirmed cause

The latest test created and confirmed booking `fba3f1b6-2092-4e1d-8b4b-5463bdd44683`, and its payment session points to that same booking. The booking owner also matches the buyer, so the checkout ID race is no longer occurring.

The experience tables have row-level access rules enabled, but none of them grant Data API privileges to signed-in users. Consequently, the booking detail query returns no visible row and the page displays “No se encontró esta reserva.” This also explains why confirmed experience bookings do not reliably appear in the Reservas list.

## Changes

1. **Restore the missing table permissions**
   - Grant signed-in users only the operations supported by each table’s existing access rules.
   - Grant backend functions full access to the four affected tables: `experience_bookings`, `experience_booking_guests`, `experiences`, and `experience_segments`.
   - Do not grant anonymous write access or weaken any row-level access rule.

2. **Preserve privacy boundaries**
   - Buyers can continue to read only their own bookings.
   - Tagged guests can continue to read only bookings assigned to them.
   - Experience owners retain their existing management access.
   - Public reads remain limited to the experience catalog and segments as already defined.

3. **Improve the detail-page failure signal**
   - Keep genuine not-found and temporary request failures separate.
   - Surface a retry action for backend/request failures rather than presenting them as a missing reservation.

4. **Verify end to end**
   - Confirm the latest paid booking is readable by its buyer through the same client-side query used by the app.
   - Confirm it appears in Tickets → Reservas.
   - Open its exact `/experience-booking/{id}` route and verify the ticket details and QR render.
   - Confirm another unrelated signed-in user cannot read it.

## Technical details

Apply a focused database migration containing explicit grants only; no booking or payment records will be modified. Then validate the live authenticated flow and run the focused experience checkout tests.

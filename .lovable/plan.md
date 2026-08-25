# Fix “No se encontró esta reserva” after experience payment

## Confirmed cause

The booking sheet creates a new booking and stores its ID in React state, but immediately calls QR generation with the old `bookingId` state value instead of the freshly returned `newBookingId`.

The latest database records confirm the race: a new pending booking was created, while the confirmed payment session was linked to the preceding booking. The success button then opened the new, unpaid booking ID rather than the booking actually confirmed by the payment.

## Changes

1. **Use the fresh booking ID for QR generation**
   - Send `newBookingId` directly to `generate-experience-qr`.
   - Do not rely on asynchronous React state during checkout setup.

2. **Make the confirmed payment authoritative**
   - Return the linked experience booking ID from the payment-status function.
   - When polling reports success, replace local state with that canonical booking ID before showing “Ver entrada”.
   - Include the booking ID in the QR-generation response as an additional consistency check.

3. **Harden the reservation detail state**
   - Use a nullable single-row lookup rather than treating a missing row as a generic query failure.
   - Show the not-found state only for a genuinely absent or inaccessible booking; preserve a useful error path for other query failures.

4. **Verification**
   - Add a focused regression test proving checkout always passes the newly created booking ID, even when an older ID is still in component state.
   - Verify the existing confirmed booking opens successfully for its buyer.
   - Smoke-test that payment confirmation redirects “Ver entrada” to the exact `experience_booking_id` stored on the confirmed payment session.

## Scope

No schema or access-policy changes are needed. Existing orphaned pending bookings can expire normally; confirmed payments and reservations will not be modified.

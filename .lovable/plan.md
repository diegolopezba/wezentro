## Problem

After a successful ticket purchase, tapping **"Ver mi entrada"** on the success screen navigates to `/tickets`, which isn't a registered route → 404.

The two real routes are:
- `/settings/tickets` — list of all the user's tickets
- `/going/:id` — the specific event entry screen with the user's QR code

## Fix

In `src/components/events/PaymentQRModal.tsx` (`handleViewTickets`), navigate to the just-purchased event's entry screen instead of the broken `/tickets`:

- Use the event ID already available in the modal (`eventId` prop passed by `useEventDetailState`) and navigate to `/going/${eventId}`.
- This lands the user directly on their newly-issued QR entry for that event — matching the button's promise ("ver mi entrada" = show *this* ticket).
- Fallback: if for some reason no `eventId` is available, navigate to `/settings/tickets` (the list) instead of the non-existent `/tickets`.

No other files change. No backend/schema/logic changes.

## Verification

- Buy a ticket end-to-end → success screen appears → tap "Ver mi entrada" → `YouAreGoing` page loads showing user name, event details, and the "Mostrar QR de Entrada" button.
- Manually visiting `/tickets` still 404s (not fixed here) — this plan only addresses the post-purchase CTA the user reported.
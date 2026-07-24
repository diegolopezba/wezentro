# Fix: Buy Ticket flow uses Qhantuy QR (not legacy join request)

## What's broken

The "Comprar" button on paid events falls through to the legacy `joinGuestlistWithPayment` path and shows *"El organizador confirmará tu pago"* — it never opens the QR modal. Root cause is a leftover BNB gate in `useEventDetailState.ts`:

```ts
const hasPaymentQr = !!(event?.payment_qr_url && hasPaidTickets);
...
if (hasPaymentQr) { setShowPaymentModal(true); return; }
// otherwise → legacy "compra registrada" toast
```

With Qhantuy, the QR is generated **on demand** by `generate-qhantuy-qr` — there is no stored `payment_qr_url`. So `hasPaymentQr` is always false for the legacy single-price flow, and the button falls into the old request-to-join branch. (Multi-tier events already go through the modal because of `hasTiers`.)

`EventDetail.tsx` and `EventDetailModal.tsx` also gate the `<PaymentQRModal>` mount on `(hasPaymentQr || hasTiers)`, so the modal isn't even in the tree for legacy paid events.

Additionally, `handlePaymentSubmitted` still calls `joinGuestlistWithPayment.mutateAsync(...)` after the QR is confirmed — but `qhantuy-callback` already upserts the guestlist row. That's a redundant double-write on success.

## The fix

### 1. Replace `hasPaymentQr` with a Qhantuy-aware flag
In `src/hooks/useEventDetailState.ts`:
- Introduce `usesPaidCheckout = hasPaidTickets` (any priced event or priced tier goes through Qhantuy).
- Remove the `event.payment_qr_url` dependency for gating.
- `handleBuyTicket` for the single-price path: if `usesPaidCheckout`, open the QR modal directly. Only free events keep the legacy join flow (guestlist RSVP).
- `handlePaymentSubmitted` becomes a lightweight refresh: invalidate `guestlist`, `tickets`, `event` queries, and open the "congrats" step (handled inside modal). Do **not** call `joinGuestlistWithPayment` — the Qhantuy callback owns that write.
- Keep `pendingCount` behavior tied to whether the event is paid.

### 2. Always mount `<PaymentQRModal>` for paid events
In `EventDetail.tsx` and `EventDetailModal.tsx`:
- Change the mount guard from `(hasPaymentQr || hasTiers)` to `(usesPaidCheckout || hasTiers)`.
- Pass `ticketTierId={selectedTier?.id ?? null}` unchanged; single-price path passes `null` and the edge function falls back to `event.price`.

### 3. Polish the buyer flow inside `PaymentQRModal.tsx`
The modal already has: loading → blurred details → revealed w/ polling → success. Tighten it to match the requested UX:

- **Details step (pre-QR):** show event title, tier name (if any), price, and a short "cómo funciona" list (1. Toca "Ver QR" · 2. Escanea desde tu app bancaria · 3. Vuelve — validamos en segundos). CTA: "Ver QR de pago".
- **QR step:** QR + amount + subtle "Esperando confirmación automática…" indicator + the 3 numbered instructions already there. Add a small "Toma unos segundos después de pagar" hint.
- **Success step (new "congrats" screen):** big check, "¡Estás dentro!" title, event title subtitle, and two buttons: primary **"Ver mi entrada"** → navigate to `/tickets`, secondary "Cerrar".
- Expired / error states already exist — keep as-is with "Reintentar".

No changes to the edge functions or DB — the callback already writes the guestlist entry and notification.

### 4. Verify
- Log in as a buyer, tap **Comprar** on a paid event owned by a business with beneficiary configured → QR modal opens, generates QR, polls, and shows congrats on payment.
- Free events still show "Free" and RSVP via `joinGuestlistWithPayment` (unchanged).
- Confirm no double guestlist inserts (callback writes, client no longer writes on success).

## Files touched

- `src/hooks/useEventDetailState.ts` — replace `hasPaymentQr` gating; simplify `handlePaymentSubmitted`.
- `src/pages/EventDetail.tsx` — update modal mount guard + destructured flag name.
- `src/components/events/EventDetailModal.tsx` — same guard update.
- `src/components/events/PaymentQRModal.tsx` — copy/UX polish for details, QR, and success steps.

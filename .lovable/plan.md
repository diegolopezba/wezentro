
## Goal

Free events use the same bottomsheet checkout flow as paid events, with a friendlier "confirm" step instead of QR payment. Users tap "Unirme" on the event, see the same ticket card sheet, and confirm with a "Sí, quiero unirme" button — only then are they added as `approved`.

## Flow (free events)

1. User taps **Unirme** on event detail.
2. Same bottomsheet opens (light theme, back button, `ENTRADA` header, ticket card).
3. Ticket card shows the event/tier name and price line reads **`Total — tranqui, es gratis 😉`** (with the winking-face emoji from the uploaded image).
4. Bottom CTA reads **`Sí, quiero unirme`** (same dark full-width pinned button styling as `Pagar por QR`).
5. Tap CTA → run capacity check + insert guestlist row with `status: "approved"` → transition sheet to the existing **success** step (checkmark + "Estás dentro" + "Ver mi entrada" → `/going/:eventId`).
6. Errors (full, already joined, network) show inline in the sheet, not a toast.

Paid flow stays exactly as it is (QR + polling).

## Changes

### 1. `src/components/events/PaymentQRModal.tsx` → generalize to a checkout sheet
- Add a `mode: "paid" | "free"` prop (default `"paid"` to preserve current call sites).
- When `mode === "free"`:
  - Skip `details → loading → revealed` QR steps. Steps become `details → submitting → success | error`.
  - Price row renders `Total` label + `tranqui, es gratis` text with the winking emoji inline (imported as `src/assets/emoji-wink.png` via `lovable-assets` from the uploaded PNG).
  - CTA renders `Sí, quiero unirme` and calls a new `onJoinFree` prop instead of the QR generation edge function.
  - Success screen copy adjusts to "Estás dentro" / "Nos vemos ahí" (no "pago confirmado" wording); "Ver mi entrada" button still routes to `/going/:eventId`.
- Keep the "back", header, ticket card, and pinned CTA layout identical for both modes.
- Optional rename note: keep filename `PaymentQRModal.tsx` for now to avoid churn; export stays `PaymentQRModal`.

### 2. `src/hooks/useGuestlist.ts` → `useJoinGuestlist` (from prior plan)
- Insert `status: "approved"`, run capacity re-check, throw friendly error `"El evento está lleno"` if full.
- Change owner notification copy to "joined your event" (type `guestlist_joined`).

### 3. `src/hooks/useEventDetailState.ts` + `src/pages/EventDetail.tsx` / `EventDetailModal.tsx`
- Free-event "Unirme" CTA opens the same `PaymentQRModal` with `mode="free"` and passes `onJoinFree={() => joinGuestlist.mutateAsync(eventId)}`.
- Button states: `Unirme` → `Estás dentro` → `Lleno`.
- Keep `Salir` for approved users.

### 4. `src/components/events/GuestlistManagementSheet.tsx`
- Hide "Solicitudes" tab for free events (no pending state exists on free path anymore). Paid events keep "Pagos".

### 5. Asset
- Save the uploaded winking emoji as a Lovable asset (`src/assets/emoji-wink.png.asset.json`) and import it into `PaymentQRModal.tsx` for the `es gratis 😉` line.

### 6. Memory
- Update `mem://index.md` core rule + `mem://features/guestlists`: free events → instant self-join via confirmation sheet, paid events → QR checkout, both share the same UI shell.

## Out of scope
- No DB migration. `status` column keeps `pending`/`rejected` for legacy/paid paths.
- No changes to Qhantuy edge functions, ticket tiers editor, invitations, or paid flow behavior.

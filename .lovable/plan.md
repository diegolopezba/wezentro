

## Invitation-Only Guestlists + Always Show Event CTA

### Summary

- Remove "Unirse" button — guestlists are now invitation-only
- Always show the floating CTA bar for non-post events (not just when guestlist or price > 0)
- Button label: "Comprar" when price > 0, "Free" when price = 0
- Remove self-join guestlist logic from the hook

### Changes

**`src/hooks/useEventDetailState.ts`**

- Remove `handleJoinGuestlist` handler entirely (users can't self-join)
- Remove `joinGuestlist` mutation import
- Add a new `handleBuyTicket` handler:
  - If `isGuest` → prompt auth
  - If `hasPaymentQr` → show payment modal
  - Else → register via `joinGuestlistWithPayment` with toast "¡Compra registrada!"
- For free events, add `handleFreeRegistration` or just make the "Free" button a no-op / navigate to event info (to be clarified — likely just shows a confirmation toast like "¡Registro confirmado!")
- Export `handleBuyTicket` instead of `handleJoinGuestlist`

**`src/pages/EventDetail.tsx`**

- Line 434: Change CTA bar guard from `!isPost && (event.has_guestlist || hasPaidTickets)` to just `!isPost`
- Lines 449-462: Remove the "Unirse" branch. For non-owner, non-guestlist users:
  - `hasPaidTickets` → `<Button onClick={handleBuyTicket}>Comprar</Button>`
  - Else → `<Button onClick={handleBuyTicket}>Free</Button>` (registers for the free event)
- Keep "Pendiente" / "Unido" status for users already on the guestlist (invited by owner)
- Line 469: Update reservation bar guard from `!(event.has_guestlist || hasPaidTickets)` to just `false` or remove it (since CTA bar always shows for events now — reservation is posts-only)

**`src/components/events/EventDetailOverlay.tsx`**

- Same changes as EventDetail.tsx:
  - Line 408: Guard → `!isPost`
  - Lines 423-437: Remove "Unirse", add "Comprar" / "Free" logic
  - Line 442: Remove or hide reservation bar for events

**`src/pages/Help.tsx`**

- Update guestlist FAQ to explain invitation-only model

### Files

| File | Change |
|---|---|
| `src/hooks/useEventDetailState.ts` | Remove `handleJoinGuestlist` + `joinGuestlist`; add `handleBuyTicket` for paid and free events |
| `src/pages/EventDetail.tsx` | CTA bar always shows for events; "Comprar" or "Free" button; remove "Unirse" |
| `src/components/events/EventDetailOverlay.tsx` | Same CTA changes |
| `src/pages/Help.tsx` | Update guestlist FAQ |


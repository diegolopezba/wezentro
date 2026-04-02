

## Decouple Tickets from Guestlist + Move Reservation Toggle to Posts Only

### Part 1 — Show ticket CTA when price > 0 (independent of guestlist)

**`src/pages/EventDetail.tsx` and `src/components/events/EventDetailOverlay.tsx`**

Change the floating CTA bar guard from:
```ts
// Before
{!isPost && event.has_guestlist && (
```
to:
```ts
// After
{!isPost && (event.has_guestlist || (event.price && event.price > 0)) && (
```

Update the button label logic inside the bar:
- Price > 0 → show "Comprar" (buy tickets)
- Price = 0 + guestlist → show "Unirse" (join guestlist)
- Already joined → show status as before

**`src/hooks/useEventDetailState.ts`**

Add `hasPaidTickets = (event?.price ?? 0) > 0` as a derived value and export it.

### Part 2 — Reservation toggle: posts only, not events

**`src/pages/Create.tsx`**

Line 278 — flip the condition:
```ts
// Before
show_reservation_button: isBusiness && reservationsEnabled && !isPost ? formData.showReservationButton : false

// After
show_reservation_button: isBusiness && reservationsEnabled && isPost ? formData.showReservationButton : false
```

Line 719 — flip the visibility guard:
```ts
// Before
{isBusiness && reservationsEnabled && !isPost &&

// After
{isBusiness && reservationsEnabled && isPost &&
```

**`src/pages/EventDetail.tsx` and `src/components/events/EventDetailOverlay.tsx`**

Update the reservation CTA bar guard to not overlap with the ticket/guestlist bar:
```ts
// Before
{(isPost || !event.has_guestlist) && event.show_reservation_button && ...

// After  
{event.show_reservation_button && !(event.has_guestlist || (event.price && event.price > 0)) && ...
```

This ensures the reservation bar only shows when there's no ticket/guestlist bar already visible.

### Files

| File | Change |
|---|---|
| `src/pages/Create.tsx` | Flip reservation toggle to posts only; keep date/time validation for events |
| `src/pages/EventDetail.tsx` | CTA bar: show for guestlist OR price > 0; reservation bar: avoid overlap |
| `src/components/events/EventDetailOverlay.tsx` | Same CTA + reservation bar changes |
| `src/hooks/useEventDetailState.ts` | Add `hasPaidTickets` derived state |


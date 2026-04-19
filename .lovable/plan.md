
The user wants a better UI for the reservation confirmation screen (`src/pages/ReservationConfirmation.tsx`). I already have the file in context. Current state:

- Full-screen overlay with business avatar as background
- Gradient overlay at bottom
- Centered text: user name, business, location, date/time/party, guests, notes
- White "Ver Menú" button

Issues with current design:
- Feels generic — looks like a generic event confirmation, not a premium restaurant booking
- Date/time/party crammed in one row, hard to scan
- No clear "ticket" feel — this is essentially a reservation receipt
- No QR/confirmation code for arrival
- No quick actions (cancel, modify, message business, directions, add to calendar)
- Notes look like an afterthought
- Background photo of business avatar can be low-res / unflattering
- Business name button is small and unclear
- No visual hierarchy — everything is the same white text on gradient

Plan: redesign as a premium "boarding pass" style ticket card with strong hierarchy, contextual actions, and a confirmation code feel — similar to OpenTable / Resy / Airbnb booking confirmations.

---

# Plan: Redesign Reservation Confirmation Screen

## Goal
Transform the confirmation screen from a generic photo-overlay into a premium, scannable "digital reservation pass" — inspired by Resy, OpenTable, and Airbnb trip confirmations.

## New Layout (top → bottom)

```text
┌─────────────────────────────┐
│  ← Close          Share ⤴  │  ← floating header
│                             │
│      ✓  Reserva confirmada  │  ← success badge (green check)
│                             │
│  ┌───────────────────────┐  │
│  │  [Business avatar]    │  │  ← Pass card (rounded-3xl, glass)
│  │  Restaurant Name      │  │
│  │  📍 Address           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  │  ← dashed divider (ticket style)
│  │                       │  │
│  │  FECHA      HORA      │  │
│  │  Vie 19 Abr  20:30    │  │  ← big, bold
│  │                       │  │
│  │  PERSONAS   CÓDIGO    │  │
│  │  4          #A7F2     │  │  ← short reservation code
│  │                       │  │
│  │  A nombre de:         │  │
│  │  [avatar] Juan Perez  │  │
│  │                       │  │
│  │  Invitados (3):       │  │
│  │  [○][○][○]            │  │
│  │                       │  │
│  │  📝 "Mesa cerca de    │  │
│  │  ventana por favor"   │  │
│  └───────────────────────┘  │
│                             │
│  Quick actions row:         │
│  [📅 Calendario] [🗺 Cómo   │
│   llegar] [💬 Mensaje]      │
│                             │
│  [   Ver Menú   ]  primary  │
│  [ Modificar ] [ Cancelar ] │  ← secondary row
└─────────────────────────────┘
```

## Key Changes

1. **Background**: Replace full-screen avatar with a subtle dark background + soft radial gradient using the business's dominant color tone (or fallback brand red glow). Cleaner, less noisy.

2. **Success badge**: Animated green checkmark at top ("Reserva confirmada") for emotional payoff.

3. **Pass card**: A central glass/elevated card with rounded-3xl corners and dashed divider separating header from details (boarding-pass aesthetic).

4. **Information hierarchy**: 
   - Date & time: large display font, side-by-side
   - Party size & confirmation code: secondary row
   - Confirmation code: derived from `reservation.id` (first 4 chars uppercased) — gives a "real reservation" feel
   - Each label small uppercase muted text, value large

5. **Guests**: Stacked overlapping avatars (max 5 + count) instead of full row — more compact.

6. **Notes**: Styled as a subtle quoted block with sticky-note icon.

7. **Quick actions row** (icon buttons): 
   - **Add to Calendar** — generates `.ics` data URI on the fly (no library needed)
   - **Cómo llegar** — opens `https://maps.google.com/?q={address}` in new tab / native maps
   - **Mensaje** — navigates to `/chats` with business pre-selected (uses existing chat flow)

8. **Primary CTA**: "Ver Menú" stays as main button (only if business has menu enabled).

9. **Secondary actions**:
   - **Modificar** — only shown if reservation is >2h away (reuses existing `useUpdateReservation` guard logic) → opens `ReservationSheet` in edit mode
   - **Cancelar** — confirm dialog → calls existing `useCancelReservation`

10. **Animations**: Stagger card and action entries with framer-motion (already in use). Subtle scale-in on the success check.

## Files to Modify
- `src/pages/ReservationConfirmation.tsx` — full redesign (single file change)

## Files to Reference (no changes)
- `src/components/reservations/ReservationSheet.tsx` — for edit mode trigger
- `src/hooks/useReservations.ts` — `useCancelReservation`, `useUpdateReservation` already exist

## What's NOT in scope
- No new database fields
- No new edge functions
- No backend changes
- No changes to the reservation flow itself — only the post-confirmation screen

## Technical notes
- Confirmation code: `reservation.id.slice(0, 4).toUpperCase()` — deterministic, no migration
- `.ics` generation: inline string template + `data:text/calendar;charset=utf-8,...` link
- Maps deep link: `geo:` on Android via Capacitor, `maps://` on iOS, fallback to `https://maps.google.com`
- All styling uses existing design tokens (brand red, glass utility, pill buttons per memory rules)

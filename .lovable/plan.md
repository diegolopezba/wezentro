

## Plan: Differentiate Edit UI for Posts vs Events

### Problem
Both posts and events share the same "Editar evento" label and the same `EditEventSheet` form, which shows event-specific fields (date, location, price, guestlist, capacity, payment QR) even for posts where they don't apply.

### Changes

**1. Dropdown menu labels** — `EventDetailOverlay.tsx` and `EventDetail.tsx`
- Change "Editar evento" → "Editar post" and "Eliminar evento" → "Eliminar post" when `event.is_post` is true

**2. EditEventSheet — conditionally hide event-only fields**
- Accept a new `isPost` boolean prop
- When `isPost` is true, hide: date/time, location, price, guestlist toggle, capacity, payment QR section
- Only show: title, description, category, and business toggles (menu/reservation)
- Change sheet title from "Editar evento" to "Editar post" when applicable
- Change save toast from "Evento actualizado" to "Post actualizado"

### Files affected

| File | Change |
|---|---|
| `src/components/events/EditEventSheet.tsx` | Add `isPost` prop, conditionally render fields and labels |
| `src/components/events/EventDetailOverlay.tsx` | Pass `isPost` to EditEventSheet, update dropdown labels |
| `src/pages/EventDetail.tsx` | Pass `isPost` to EditEventSheet, update dropdown labels |


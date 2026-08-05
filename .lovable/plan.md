# Entradas + Reservas as a main nav tab

Replace the Chats tab in the bottom nav with a Tickets tab that opens a single page containing both "Entradas" and "Reservas" as pills.

## What changes

1. **New page `/tickets`** (`src/pages/MyTickets.tsx`)
   - Header with title "Entradas" (no back button, it is a root tab).
   - Two pills: "Entradas" and "Reservas" (pill style matching the rest of the app), default "Entradas".
   - "Entradas" renders the existing ticket list logic from `Tickets.tsx`; "Reservas" renders the existing reservation list logic from `MyReservations.tsx`.
   - Existing page files are refactored into content components so no functionality is lost (QR dialog, cancel/edit reservation sheet, empty states, skeletons all preserved).

2. **Bottom nav** (`src/components/layout/BottomNav.tsx`)
   - Replace the `MessageCircle` / `/chats` item with a `Ticket` icon pointing to `/tickets` (label "Entradas", requires auth).
   - Chats item removed from the nav (page and routes stay reachable in code, just hidden).

3. **Routing** (`src/App.tsx`)
   - Add `/tickets` inside the `KeepAliveLayout` block (so it gets keep-alive like other tabs), replacing `/chats` in that block; `/chats` becomes a regular lazy route so existing links/deep links still work.
   - Keep `/settings/tickets` and `/settings/reservations` as redirects to `/tickets` so old links and the post-purchase fallback in `PaymentQRModal` still land somewhere valid.

4. **Settings** (`src/pages/Settings.tsx`)
   - Point the "Entradas" and "Mis Reservas" rows at `/tickets` (or remove them, see question below).

## Technical notes

- Both source pages currently wrap themselves in `AppLayout`; the content components will drop that wrapper and the new page provides one `AppLayout` (nav visible, since it is a tab).
- Pill switching is local state only, no data changes; each tab keeps its own react-query cache so switching is instant.
- No database or backend changes.

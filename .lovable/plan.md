# Keep past tickets and reservations visible

Right now they disappear: the tickets query only returns entries whose event starts in the future, and the reservations query only returns reservations dated today or later. Nothing is deleted — it is just filtered out of the page.

Proposal: keep both lists focused on what's upcoming, but add a past section so history is never lost.

## What changes

1. **Entradas tab**
   - Remove the "future events only" filter from the query and split results into "Próximas" and "Pasadas" (event start before now).
   - Past tickets render in a collapsed group ("Pasadas") below the upcoming ones, sorted newest first, dimmed (reduced opacity), with a small "Finalizado" badge.
   - Past tickets stay tappable to open the event/ticket, but the "Ver QR" action is replaced by a plain chevron since the code is no longer usable for entry.
   - Empty state only shows when there are neither upcoming nor past tickets.

2. **Reservas tab**
   - Same treatment: drop the `>= today` cutoff, group into upcoming and "Pasadas" (including cancelled ones already in range), dimmed, no Modificar/Cancelar buttons on past entries.

3. **Limits**
   - Past groups load the most recent 30 entries with a "Ver más" button, so history doesn't slow the page down.

## Technical notes

- Files: `src/components/tickets/TicketsList.tsx`, `src/components/tickets/ReservationsList.tsx`.
- Tickets: the embedded `events` filter (`gt event.start_datetime`) is removed; partitioning happens client-side on `event.start_datetime`.
- Reservations: `gte reservation_date` removed from both the owned and tagged queries; ordering flips to descending for the past group.
- No database, RLS, or backend changes — data already exists and is readable.

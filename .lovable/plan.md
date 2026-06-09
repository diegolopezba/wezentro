## Goal

On the Tickets page (`/settings/tickets`):
- Only show tickets for entries the user was actually **approved** for (hide `pending` ones).
- For **approved free events**, show a clear "Ver QR" action directly on the ticket row so the user can pull up their entrance QR without leaving the page.
- Paid tickets keep their current behavior (badge + tap-through to `/going/:id`).

## Changes — `src/pages/Tickets.tsx`

1. **Query filter**: change `.in("status", ["approved", "pending"])` to `.eq("status", "approved")`. Pending guestlist requests will no longer appear in Entradas.

2. **Per-row classification**: for each ticket, derive:
   - `isFree = !event.price || event.price === 0` (paired with `payment_status` being `none`/null).
   - `qrToken = ticket.qr_code_token`.

3. **UI on the row**:
   - Keep the existing row layout (image, title, host, date, badge).
   - For **free approved tickets**, replace the `ChevronRight` with a small pill button **"Ver QR"** (brand-red, `rounded-full`, `active:` feedback per native-first rule). Tapping it opens an inline `Dialog` showing the QR (reuse the same `QRCodeSVG` block from `YouAreGoing.tsx`) — no navigation away.
   - For **paid approved tickets** (payment confirmed), keep the current tap-through to `/going/:id` and the `ChevronRight`.

4. **QR Dialog** (local to Tickets page): minimal dialog with event title, white-bg QR square (`QRCodeSVG` value = `qr_code_token`, size 200, level "H"), and helper text "Muestra esto en la entrada". Mirror the styling already used in `YouAreGoing`.

## Out of scope

- No DB or RLS changes.
- No changes to `YouAreGoing.tsx`, guestlist approval flow, or event detail capacity logic.
- Paid-ticket flow stays exactly as it is.

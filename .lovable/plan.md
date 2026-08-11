# Visual venue layouts — Phase 1 (area-level selection)

Opt-in per event. Events without areas keep the exact current ticket-tier flow.
Scope is area-level only (no numbered seats).

## Stage 1 — Schema and booking safety

New tables (one migration, with GRANTs + RLS as in existing migrations):

- `venue_layouts` — reusable template owned by a business profile: `business_id` (FK `profiles.id`), `name`, `canvas_width`, `canvas_height`, timestamps.
- `venue_layout_areas` — `layout_id`, `name`, `area_type` (enum `venue_area_type`: table / lounge / long_table / section / general_admission), `capacity`, `is_exclusive`, `pos_x`, `pos_y`, `width`, `height`, `rotation`, `color`, `display_order`, `default_price`.
- `event_areas` — snapshot copied per event: `event_id`, `source_layout_area_id` (nullable, traceability), plus name/type/capacity/is_exclusive/price/geometry/color/`is_active`/`display_order`/timestamps.
- `area_bookings` — `event_area_id`, `user_id`, `party_size`, `status` (`held` / `confirmed` / `cancelled`), `hold_expires_at`, `payment_session_id` (nullable), `guestlist_entry_id` (nullable), timestamps.

Access rules: owners manage layouts and their events' areas; everyone can read active areas of published events; users read their own bookings; writes to bookings only through the booking function.

Atomic booking function `hold_event_area(_event_area_id, _party_size)` (security definer):
1. `SELECT ... FOR UPDATE` on the `event_areas` row — serializes all concurrent attempts for that area.
2. Count existing `held` (not expired) + `confirmed` bookings.
3. Exclusive area: reject if any exist. Shared area: reject if `sum(party_size) + _party_size > capacity`.
4. Insert a `held` row with `hold_expires_at = now() + 10 minutes` (same window as the QR flow).
Expired holds are ignored by the capacity check, and a cleanup job flips them to `cancelled` so the data stays honest.

Availability read: `get_event_area_availability(_event_id)` returns per-area remaining capacity and state (available / partial / unavailable), ignoring expired holds.

## Stage 2 — Business layout builder

- Shared grid canvas component: snap-to-grid boxes, drag to move, corner handle to resize, tap to edit (name, type, capacity, exclusive toggle, price, color), duplicate button for "Table 1, 2, 3…".
- Standalone "Venue Layouts" screen under Business settings: create / edit / delete reusable templates.
- New skippable step in the event creation flow: "usar layout" → pick an existing template (copies areas into `event_areas` with editable per-event prices) or draw from scratch, or skip entirely to keep today's ticket-tier flow.

## Stage 3 — User checkout

- Event detail: if the event has active `event_areas`, the buy CTA opens a read-only layout sheet instead of `TicketTierPicker`; otherwise nothing changes.
- Areas render in position, colored by availability (available / partial / taken), labeled name + capacity + price.
- Tap an area → detail sheet with party-size stepper (capped at remaining capacity for shared areas) → hold is taken, then the existing Qhantuy QR modal opens for that price.
- Availability is re-read immediately before QR generation, and the hold itself is the real guard — if the area was just taken, the user gets a clear "ya no está disponible" state instead of a QR.
- Payment confirmation (callback + polling) flips the booking to `confirmed` alongside the existing guestlist entry.

## Friction points in the current payment flow (flagged upfront)

1. **`payment_sessions` has no area column and no expiry column.** I'll add `event_area_id` and `party_size`, and pass them through `generate-qhantuy-qr`. The 10-minute hold lives on `area_bookings`, since the current flow tracks expiry only by polling Qhantuy.
2. **`guestlist_entries` is unique on `(event_id, user_id)`** — one row per person per event. So a user can hold only one area per event, and a party of 6 is one entry with the party size recorded on the booking, not 6 guest rows. Check-in scans one QR for the whole area. Say the word if you want per-guest QRs; that's a schema change.
3. **There is no separate `tickets` table** — the ticket record is `guestlist_entries`, so `area_bookings.ticket_id` maps to `guestlist_entry_id`.
4. **`qhantuy-callback` currently only increments `ticket_tiers.sold_count`.** It needs a branch that confirms the booking; if the callback arrives after the hold expired but the area is still free, the booking is confirmed anyway, and if the area was taken meanwhile the payment is flagged for the owner rather than silently lost.
5. **No cron exists for expired payment sessions today**, so the hold cleanup job is new infrastructure (a light scheduled sweep, in line with the existing cron throttling).

## Order of delivery

Stage 1 (migration + functions) → you review → Stage 2 (builder) → you review → Stage 3 (checkout). Reservations integration stays out of this phase.

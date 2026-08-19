# Reservation System: Audit and Table-Inventory Upgrade

## What exists today

- Business config (on the business profile): reservations on/off, one global start time, one global end time, one capacity number ("people per time slot").
- Guest flow: bottom sheet with 4 steps (date up to 21 days out, time in 30-min slots, party size, notes + tagged friends).
- Availability: the app fetches confirmed reservations for the selected date in the browser, sums party sizes per slot, and marks slots available / limited / full.
- Records: date, time, party size, notes, status (defaults to `confirmed`), cancelled_by. Guests can be tagged. Reminders are scheduled by a database trigger.
- Business side: a list of upcoming reservations grouped by day, with cancel and message actions; a Reservas tab in the dashboard.

## Gaps found (verified in code and database)

1. **Capacity is only enforced in the browser.** The database has no capacity check and no policy blocking overbooking. Two people booking at the same time, or anyone calling the API directly, can exceed capacity. The "users can update own reservations" policy also lets a guest move a booking into a full slot.
2. **No table or duration model.** A 20:00 booking never frees up, so one flat "capacity per slot" number both over- and under-books.
3. **No status lifecycle.** Status is free text defaulting to `confirmed`; no seated, completed or no-show.
4. **One schedule for all days.** Single start/end time for every day; no closed days or blackout dates.
5. **No booking policies.** No lead time, max party size, cancellation window, or duplicate-booking limit.
6. **No confirmation email / add-to-calendar.**
7. **No past history or no-show tracking** on the business side.
8. **No waitlist** when a slot is full.

## How the leading apps do it (OpenTable, Resy, SevenRooms, Tock)

- Inventory is modeled as **tables with seat counts and turn times**; availability is computed server-side over overlapping intervals, and the system assigns the best-fitting table.
- **Pacing controls**: a max number of covers per 15-minute interval on top of raw table capacity.
- **Per-day schedules and shifts** (lunch/dinner) with closures and special dates.
- **Status lifecycle**: booked → confirmed → seated → completed, plus cancelled and no-show.
- **Policies**: lead time, party-size limits, cancellation window, arrival grace period.
- **Guest communication**: instant confirmation email with add-to-calendar and cancel/modify links, day-before reminder.
- **Waitlist / notify-me** when the requested slot is full.

## Decisions locked in

- **Table-level inventory**: businesses configure real tables with seat counts.
- **Bookings auto-confirm** — no manual approval step.
- **Monetization is out of scope for now** (no deposits, no pre-order payments, no commission). The data model will not block adding it later, but nothing payment-related is built in this work.

## Proposed work (phased)

### Phase 1 — Table inventory and server-side booking
- Businesses define their tables: name/number, seat count, zone (interior, terraza, barra), active flag. Bulk "add N tables of X seats" for fast setup.
- Turn time per business (default 90 min), with optional per-table override.
- A database function assigns the smallest suitable table (or a combination, when the business allows joining tables) for the requested party size and time window, with row locking so two simultaneous bookings can never take the same table.
- Availability is computed server-side over overlapping time intervals, returning per-slot status and the party sizes that still fit.
- Real status lifecycle: confirmed, seated, completed, cancelled, no_show.
- Tighten policies so guests can only book and modify through the validated function.

### Phase 2 — Business controls
- Per-day schedule and shifts (lunch/dinner), closed days, blackout dates — replacing the single start/end pair.
- Policies: minimum lead time, max party size, cancellation window, pacing limit (max covers per 15 min).
- Mesas editor in business settings, with a migration path from the current single "capacity" number.

### Phase 3 — Guest experience
- Confirmation email with add-to-calendar and cancel/modify link; day-before reminder reuses the existing reminder job.
- Waitlist / notify-me when a slot is full, with an automatic offer when a table frees up.
- Clear policy text in the booking sheet (cancellation window, arrival grace period).

### Phase 4 — Operations and insight
- Business day view: floor list by shift and table, seat / no-show / complete actions, past history, guest search.
- Dashboard metrics: covers, no-show rate, cancellation rate, peak slots, repeat guests.

## Technical notes

- New tables: `restaurant_tables` (business, name, seats, zone, active), `reservation_policies` (per business), `reservation_schedules` (per weekday), `reservation_blackouts`, `reservation_waitlist`. Extend `reservations` with `table_id`, `duration_minutes`, `seated_at`, `completed_at`, and a status check constraint.
- New functions: `get_reservation_availability(business, date, party_size)` and `create_reservation` / `update_reservation` doing validated, row-locked writes that check tables, hours, lead time and party-size limits.
- Every new public table gets GRANTs and RLS scoped to the guest and the owning business.
- Client: `useSlotAvailability` and `useReservations` switch from raw table reads to these functions; the booking sheet keeps its 4-step UI; business settings gains the Mesas and schedule editors.
- Emails go through the existing transactional email pipeline and template registry.

# Reservation System: Audit and Upgrade Plan

## What exists today

- Business config (on the business profile): reservations on/off, one global start time, one global end time, one capacity number ("people per time slot").
- Guest flow: bottom sheet with 4 steps (date up to 21 days out, time in 30-min slots, party size, notes + tagged friends).
- Availability: the app fetches confirmed reservations for the selected date in the browser, sums party sizes per slot, and marks slots available / limited / full.
- Records: date, time, party size, notes, status (defaults to `confirmed`), cancelled_by. Guests can be tagged. Reminders are scheduled by a database trigger.
- Business side: a list of upcoming reservations grouped by day, with cancel and message actions; a Reservas tab in the dashboard.

## Gaps found (verified in code and database)

1. **Capacity is only enforced in the browser.** The database has no capacity check and no policy blocking overbooking. Two people booking at the same moment, or anyone calling the API directly, can exceed capacity. The "users can update own reservations" policy also allows moving a reservation into a full slot.
2. **No table/duration model.** Real booking systems reserve a *table for a duration* (e.g. 90 min). Here a 20:00 booking frees nothing at 20:30, so a single "capacity per slot" number both over- and under-books.
3. **No status lifecycle.** Status is free text defaulting to `confirmed`; there is no pending/approval path, no seated, no completed, no no-show, and no way for the business to require confirmation for large parties.
4. **One schedule for all days.** A single start/end time applies to every day of the week; no per-day hours, no closed days, no holiday/blackout dates, no temporary pause for a fully booked night.
5. **No booking policies.** No minimum lead time, no maximum party size (large groups should route to a request), no cancellation window, and no limit on duplicate bookings by the same user.
6. **No confirmation email / calendar file.** The guest only gets in-app confirmation; industry standard is instant email + add-to-calendar, plus a cancel/modify link.
7. **Weak no-show and history handling.** Business list only shows upcoming, non-cancelled bookings; no past history, no no-show marking, no guest reliability signal.
8. **No waitlist.** When a slot is full the guest only sees nearby alternatives; standard apps offer to notify when a slot frees up.

## How the leading apps do it (OpenTable, Resy, SevenRooms, Yelp/Google reservations)

- Inventory is modeled as **tables/seat groups with turn times**, not a flat headcount per slot; availability is computed server-side over overlapping intervals.
- **Pacing controls**: max covers per 15 min interval so the kitchen isn't slammed, on top of raw capacity.
- **Per-day schedules and shifts** (lunch/dinner) with closures and special dates.
- **Status lifecycle**: booked → confirmed (guest reconfirms) → seated → completed, plus cancelled and no-show; large parties or high-risk times require approval.
- **Policies**: lead time, party-size limits, cancellation window, and sometimes a hold/deposit for big groups.
- **Guest communication**: instant email/SMS confirmation with cancel + modify links, reminder the day before, and post-visit follow-up.
- **Waitlist / notify-me** when the requested slot is full.

## Proposed work (phased)

### Phase 1 — Correctness and trust (foundation)
- Move availability and booking into a database function that checks capacity, business hours, lead time and party-size limits inside a transaction, so overbooking becomes impossible.
- Introduce turn time (default 90 min, configurable) so a booking consumes capacity across the interval it actually occupies.
- Tighten the update policies so guests can only change their own booking through the validated path.
- Add a real status lifecycle: pending, confirmed, seated, completed, cancelled, no_show.

### Phase 2 — Business controls
- Per-day schedule with shifts, closed days and blackout dates, replacing the single start/end pair.
- Settings for turn time, max party size, minimum lead time, cancellation window, and optional "requires approval" (all bookings, or only parties over N).
- Pacing limit: max covers per 15-minute interval.

### Phase 3 — Guest experience
- Confirmation email with add-to-calendar and cancel/modify links; day-before reminder reusing the existing reminder job.
- Waitlist / notify-me when a slot is full, with an automatic offer when capacity opens.
- Clear policy text in the booking sheet (cancellation window, arrival grace period).

### Phase 4 — Operations and insight
- Business day view: timeline by shift, seat/no-show marking, past history, search by guest.
- Dashboard metrics: covers, no-show rate, cancellation rate, peak slots, repeat guests.

## Technical notes

- New tables: reservation policy/schedule per business (per-day rows), blackout dates, waitlist entries. Extend `reservations` with `duration_minutes`, `seated_at`, `completed_at`, and a status check constraint.
- New database functions: `get_reservation_availability(business, date, party_size)` returning slot statuses, and `create_reservation` / `update_reservation` doing validated writes with row locking. Every new public table gets grants plus RLS scoped to the guest and the owning business.
- Client hooks `useSlotAvailability` and `useReservations` switch from raw table reads to these functions; the booking sheet keeps its current 4-step UI.
- Emails go through the existing transactional email pipeline and template registry.

## Decisions needed before building

- Should businesses model actual tables (2-top, 4-top…), or keep a total-seats-per-interval model with turn time? Total-seats plus turn time is far simpler and covers most venues here.
- Should bookings be auto-confirmed by default, with approval only as an opt-in for large parties?

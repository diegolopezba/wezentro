# Reservation System: Audit, Table Inventory and Monetization

## What exists today

- Business config (on the business profile): reservations on/off, one global start time, one global end time, one capacity number ("people per time slot").
- Guest flow: bottom sheet with 4 steps (date up to 21 days out, time in 30-min slots, party size, notes + tagged friends).
- Availability: the app fetches confirmed reservations for the selected date in the browser, sums party sizes per slot, and marks slots available / limited / full.
- Records: date, time, party size, notes, status (defaults to `confirmed`), cancelled_by. Guests can be tagged. Reminders are scheduled by a database trigger.
- Business side: a list of upcoming reservations grouped by day, with cancel and message actions; a Reservas tab in the dashboard.
- Payments already exist for tickets through Qhantuy QR (beneficiary per business, QR generation, callback, payment sessions).

## Gaps found (verified in code and database)

1. **Capacity is only enforced in the browser.** The database has no capacity check and no policy blocking overbooking. Two people booking at the same time, or anyone calling the API directly, can exceed capacity. The "users can update own reservations" policy also lets a guest move a booking into a full slot.
2. **No table or duration model.** A 20:00 booking never frees up, so one flat "capacity per slot" number both over- and under-books.
3. **No status lifecycle.** Status is free text defaulting to `confirmed`; no seated, completed or no-show.
4. **One schedule for all days.** Single start/end time for every day; no closed days or blackout dates.
5. **No booking policies.** No lead time, max party size, cancellation window, or duplicate-booking limit.
6. **No confirmation email / add-to-calendar.**
7. **No past history or no-show tracking** on the business side.
8. **No waitlist** when a slot is full.
9. **No monetization**: reservations generate zero revenue today.

## How the leading apps monetize reservations

- **OpenTable**: SaaS subscription per restaurant plus a per-cover fee (roughly $0.25–$1.50 per seated diner, higher for diners sourced from their marketplace). Revenue is tied to seated covers, not to the guest.
- **Resy**: mostly flat SaaS subscription tiers for the restaurant; consumer side free. Adds ticketed/prepaid events for high-demand nights.
- **Tock**: the prepay pioneer — tickets, deposits and prepaid tasting menus, taking a commission on the prepaid amount plus a subscription. This is the closest model to what you describe.
- **SevenRooms / Eat App / Guest Manager (Yelp)**: subscription plus optional deposit/no-show fee processing, with card-on-file authorization instead of an actual charge.
- **Delivery/marketplace players (Uber Eats, Google)**: commission on the order value, not on the seat.
- **Universal pattern**: the *deposit* exists to reduce no-shows, not to make money. It is usually **refundable or credited to the bill** if the guest shows up, and forfeited only under a stated cancellation window. Restaurants apply it selectively (large parties, peak nights, tasting menus), not to every booking, because a mandatory fee on every table measurably reduces bookings.

**Implication for the proposed model**: charging 6% on pre-orders is well aligned with Tock's commission-on-prepay model. Charging 50 Bs per seat on every reservation is not standard as a *fee*; the standard is a per-seat **deposit that is credited toward the bill** (or refunded on timely cancellation), with the platform taking its commission on that amount too. Recommendation: keep both paths, make the deposit refundable/creditable, and make it opt-in per business (and optionally only for parties over N or specific peak shifts).

## Decisions locked in

- **Table-level inventory**: businesses configure real tables with seat counts.
- **Bookings auto-confirm** once payment (pre-order or deposit) succeeds; no manual approval step.
- **Monetization**: 6% platform commission on pre-orders; optional per-seat deposit (default suggestion 50 Bs) credited to the bill, also commissionable.

## Proposed work (phased)

### Phase 1 — Table inventory and server-side booking
- Businesses define their tables: name/number, seat count, zone (interior, terraza, barra), active flag. Bulk "add N tables of X seats" for fast setup.
- Turn time per business (default 90 min), per-table override optional.
- A database function assigns the smallest suitable table (or a combination, if the business allows joining tables) for the requested party size and time window, with row locking so two simultaneous bookings can never take the same table.
- Availability is computed server-side over overlapping time intervals, returning per-slot status and which sizes still fit.
- Real status lifecycle: pending_payment, confirmed, seated, completed, cancelled, no_show.
- Tighten policies so guests can only book/modify through the validated function.

### Phase 2 — Business controls
- Per-day schedule and shifts (lunch/dinner), closed days, blackout dates.
- Policies: minimum lead time, max party size, cancellation window, pacing limit (max covers per 15 min).
- Reservation payment settings: deposit off / per-seat amount, pre-order on/off, which parties or shifts require it, refund window.

### Phase 3 — Pre-order and deposit checkout
- In the booking sheet, after picking table/time/party size, an optional step to pre-order from the existing menu (menus, categories, items already exist in the database).
- Payment step reuses the Qhantuy QR checkout used for tickets: total = pre-order subtotal and/or deposit x seats; the reservation is held for a short window while payment completes and auto-releases if it doesn't.
- Platform commission of 6% recorded per reservation payment; the business's payout amount is stored alongside so the dashboard can show gross, commission and net.
- Refund/credit handling: cancellation inside the window refunds according to the business's policy; on arrival the deposit shows as credit toward the bill on the business's reservation detail.
- Businesses without payout setup keep free reservations exactly as today.

### Phase 4 — Guest experience and operations
- Confirmation email with add-to-calendar, order summary and cancel/modify link; day-before reminder reuses the existing reminder job.
- Waitlist / notify-me when the requested slot is full.
- Business day view: floor list by shift and table, seat / no-show / complete actions, past history, guest search.
- Dashboard metrics: covers, no-show rate, pre-order revenue, deposits collected, commission, peak slots.

## Technical notes

- New tables: `restaurant_tables` (business, name, seats, zone, active), `reservation_policies` (per business), `reservation_schedules` (per weekday) and `reservation_blackouts`, `reservation_orders` + `reservation_order_items` (pre-order lines referencing `menu_items`), `reservation_waitlist`. Extend `reservations` with `table_id`, `duration_minutes`, `deposit_amount`, `prepaid_amount`, `platform_fee_amount`, `payment_status`, `seated_at`, `completed_at`, `hold_expires_at`.
- New functions: `get_reservation_availability(business, date, party_size)`, `hold_reservation(...)` (locks a table, creates a pending row with expiry), `confirm_reservation_payment(...)` called from the Qhantuy callback, plus a cleanup job for expired holds mirroring `cleanup_expired_area_holds`.
- Every new public table gets GRANTs and RLS scoped to the guest and the owning business; money fields are written only by security-definer functions and the payment callback.
- Client: `useSlotAvailability` and `useReservations` switch to these functions; the booking sheet gains pre-order and payment steps; business settings gains a Mesas editor and a reservation-payments section.
- Emails go through the existing transactional email pipeline and template registry.

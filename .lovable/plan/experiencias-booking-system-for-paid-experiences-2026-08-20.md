# Experiencias: booking system for paid experiences

Merge the two systems we already have — reservations (schedule, slots, capacity, auto-confirm) and ticket payments (Qhantuy QR, guest tagging, emailed tickets) — into a new **Experiencias** module. A business configures experience segments with their own prices, days, times and spots; guests book and prepay through the same bottom-sheet flow used for tickets, and receive a QR ticket.

## Decisions already set

- Any account with registered payout details (Qhantuy beneficiary) can sell experiences.
- Capacity is **spots per slot** (e.g. 8 people at 09:00), not tables.
- Payment is **prepay via QR**; the booking is confirmed only after the payment callback.
- Experiences are attached to **posts** (not events): the creator toggles the "Reservar" CTA on the post, and picks the experience it points to.
- On a profile, the "Reservar" button opens experiences. If a food business has both table reservations and experiences active, the sheet opens with a first slide: **Reservar mesa** / **Reservar experiencia**.

## Business side — configuration

New subsection in Business settings, in the same grouped-row style as the others: **Experiencias** (`/settings/business/experiences`).

- Master toggle "Activar experiencias" (mirrors the reservations toggle). Gated by an active payout beneficiary — if missing, show the existing `BeneficiaryRequiredSheet` and a link to payment settings.
- List of experiences with an add/edit bottom sheet. Per experience:
  - Name, description, cover image, duration (minutes), meeting point / location note.
  - **Segmentos**: named price tiers (e.g. "Adulto", "Niño", "Grupo"), each with price in Bs. and optional per-booking max. Reuses the mental model and UI shape of `TicketTiersEditor`.
  - **Disponibilidad**: weekday schedule with one or more shifts and a slot interval, plus blackout dates — same editor pattern as `ReservationScheduleEditor`.
  - **Cupos por horario**: spots per slot, min lead time, cancellation window — same pattern as `ReservationRulesEditor`.
  - Active / paused switch.
- Bookings for an experience are visible in the business dashboard Reservas tab, filterable by experience, with the existing seated/completed/no-show/cancel actions and QR check-in reuse.

## Creator side — attaching to a post

In Create (post mode) and `EditEventSheet`, when the account has at least one active experience:

- The existing "Mostrar botón de reservar" toggle stays, and gains a picker: which experience the CTA books. Saved as a new nullable `experience_id` on the post.
- If no experience is selected, the CTA behaves as today (table reservation).

## Guest side — booking flow

One sheet, stepwise, matching the current reservation sheet's chip-step UI and the tickets checkout:

```text
[ Mesa o Experiencia? ]  (only when both are active)
        |
   Experiencia  ->  Fecha  ->  Horario (spots left per slot)  ->  Segmento + cantidad
        |                                                             |
        |                                                    Asignar invitados (opcional)
        |                                                             |
        +------------------------------------------------>  Resumen + Pagar (QR)
                                                                      |
                                                        Confirmación -> "Ver entrada"
```

- Slot pills show available / limited / full exactly like the reservation sheet, driven by a server function that subtracts booked spots.
- Quantity stepper and guest tagging reuse `TicketAssigneeRow`.
- Payment reuses `PaymentQRModal` and the Qhantuy QR generation/callback functions; spots are held while the QR is pending and released on expiry.
- On success the guest lands on the existing confirmation screen with "Ver entrada"; the ticket shows experience name, segment, date and time. Buyer and tagged guests get the ticket email.
- Bookings appear in the unified `/tickets` screen under the existing list, with past ones in "Pasadas".

## Technical notes

Database (new tables, all with GRANTs + RLS):

- `experiences` — business_id, title, description, image_url, duration_minutes, location_note, is_active.
- `experience_segments` — experience_id, name, description, price, max_per_booking, display_order, is_active.
- `experience_schedules` — experience_id, weekday, shift start/end, slot_interval_minutes, is_closed.
- `experience_blackouts` — experience_id, date, reason.
- `experience_policies` — experience_id, spots_per_slot, min_lead_minutes, cancellation_window_hours.
- `experience_bookings` — experience_id, segment_id, user_id, date, time, quantity, amount, status (`pending_payment` / `confirmed` / `cancelled` / `completed` / `no_show`), payment_session_id, qr token for check-in.
- `experience_booking_guests` — booking_id, user_id (tagged guests, mirrors `reservation_guests`).
- `events.experience_id` — nullable FK so a post's "Reservar" CTA targets a specific experience.

Server functions (PL/pgSQL, mirroring the reservation engine so the rules live in one place):

- `get_experience_availability(_experience_id, _date, _quantity)` → one row per slot with status and `spots_left`, applying schedule, blackouts, lead time and pending holds.
- `create_experience_booking(...)` → row-locked capacity check, creates the booking as `pending_payment`, returns the id for the QR step.
- `set_experience_booking_status(...)` → lifecycle actions with the same authorization checks as `set_reservation_status`.

Edge functions: extend `generate-qhantuy-qr` and `qhantuy-callback` to accept an experience booking (confirming it and issuing tickets), and reuse the transactional email pipeline with an experience-booking template.

Frontend: new `useExperiences`, `useExperienceAvailability`, `useExperienceBooking` hooks; `ExperiencesEditor` + `ExperienceEditSheet` + segment/schedule/rules editors under `src/components/experiences/`; `ExperienceBookingSheet` and a `BookingTypeChooser` first slide reused by `UserProfile`, `EventDetail`, `EventDetailModal` and `AttachedBusinessCtas`. All sheets use `light-sheet`, `rounded-t-3xl` and the `sheet-action` button variant.

# Mensajes del organizador a los asistentes

Event owners get a way to message everyone confirmed for their event — before, during and after it — as an in-app notification plus a phone push. Messages can be sent immediately or scheduled for a specific date and time, with a cap of 3 messages per event per day.

## What the organizer sees

A new "Mensajes" action on the event's owner view (the owner action sheet / event management surface) opens a bottom sheet:

- Title + message body (short character limits, live counter)
- Audience summary: "Se enviará a N asistentes confirmados"
- Timing: "Enviar ahora" or "Programar" with a date/time picker
- Quick presets that only prefill the text: Antes del evento (recordatorio), Durante (aviso en vivo), Después (gracias)
- History list of past and scheduled messages for that event, with the option to cancel a scheduled one
- If the daily cap is reached: the send button is disabled with "Ya enviaste 3 mensajes hoy"

## What attendees get

- A notification in the notifications feed, typed `event_announcement`, that opens the event when tapped
- A push notification on their device (same title/body), routed to the event

Recipients are confirmed attendees only: approved guestlist entries, paid ticket holders, and redeemed special invites. Deduplicated by user, and users the organizer has blocked or who have blocked the organizer are excluded.

## Technical details

**Database**
- New table `event_announcements`: `id`, `event_id`, `sender_id`, `title`, `body`, `scheduled_for` (nullable), `status` (`scheduled` | `sent` | `cancelled` | `failed`), `recipient_count`, `sent_at`, `created_at`. GRANTs for `authenticated`/`service_role`, RLS so only the event owner (and collaborators with manage rights, matching the existing event-owner check) can insert/select/cancel rows for their event.
- Daily cap enforced server-side in the send function (count of non-cancelled rows for that event in the last 24h), and mirrored in the UI.

**Recipient resolution**
A security-definer function `get_event_announcement_recipients(event_id)` returns distinct `user_id` from: `guestlist_entries` with `status = 'approved'`, `payment_sessions` in a paid/confirmed state for that event, and `event_special_invites` that were redeemed, minus blocked pairs.

**Edge function `send-event-announcement`**
- Validates JWT, verifies caller owns the event, validates payload with Zod, enforces the 3/day cap
- Immediate send: resolves recipients, bulk-inserts `notifications` rows (`type = 'event_announcement'`, `entity_type = 'event'`, `entity_id = event_id`), then calls the existing `send-push-notification` function with the recipient list and a `url` pointing at the event so the existing push deep-link handler routes correctly
- Scheduled send: just writes the `scheduled` row and returns

**Dispatcher**
A `pg_cron` job every 5 minutes calls a `dispatch-event-announcements` edge function that picks up `scheduled` rows whose `scheduled_for` has passed, sends them through the same path, and marks them `sent` (or `failed` with the error).

**Frontend**
- `src/hooks/useEventAnnouncements.ts` — list, create, cancel, plus recipient count
- `src/components/event/EventAnnouncementSheet.tsx` — the composer sheet, following the existing bottom-sheet conventions (24px radius, light-sheet styling, dirty-state action button)
- Entry point added to the existing owner actions for an event
- `src/pages/Notifications.tsx` — icon, label and tap routing for the new `event_announcement` type

No changes to the push infrastructure itself; this reuses `send-push-notification` as it stands today.

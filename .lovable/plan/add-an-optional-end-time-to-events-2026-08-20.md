# Add an optional end time to events

Events currently capture only a start date and time. This adds an optional "Hora de fin" so hosts can say when the event wraps up, stores it in the existing `end_datetime` column, and shows it where the start time is shown.

## Behavior

- On the create page (events only), next to Fecha and Hora, add an optional "Hora fin (opcional)" time field.
- If the end time is earlier than or equal to the start time, it is treated as the next day (e.g. 22:00 to 03:00 becomes an overnight event).
- Leaving it empty keeps current behavior exactly: no end time stored.
- The same optional field appears in the edit sheet, prefilled from the saved value and clearable.
- Event detail shows the range when an end time exists: "22:00 - 03:00" instead of just "22:00"; unchanged when empty.

## Technical notes

- No database change needed: `events.end_datetime` already exists (nullable) and is already selected by the feed/detail hooks.
- `src/pages/Create.tsx`: add `endTime` to form state, render the field inside the event-only block, compute `end_datetime` ISO alongside `startDatetime` (adding one day when the end is not after the start), and include it in the insert payload. Field stays optional in validation.
- `src/components/events/EditEventSheet.tsx`: add `end_datetime` to the local form state (formatted `yyyy-MM-dd'T'HH:mm`, empty when null), render a `datetime-local` input under Fecha y hora, and pass `end_datetime` (or `null`) to the update mutation. `useEventMutations` already accepts the field.
- Event detail time rendering: extend the existing start-time formatting to append the end time when present.
- `useEventDetailState` already prefers `end_datetime` for expiry, so past-event logic improves automatically for events that set it.

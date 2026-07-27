## Goal
On the event detail view, once an event's date has passed (calendar day, ignoring time), replace the price + action button in the floating CTA bar with the message "Este evento ha terminado".

## Logic
Add a derived `hasEnded` flag in `src/hooks/useEventDetailState.ts`:
- Take `end_datetime` if present, otherwise `start_datetime`.
- Compare the event's calendar day against today's calendar day (both normalized to local midnight).
- `hasEnded = eventDay < today` — so an event still shows normally all day long on its own date, and only flips the day after.
- Export `hasEnded` from the hook.

## UI
In both `src/pages/EventDetail.tsx` and `src/components/events/EventDetailModal.tsx`, in the floating CTA bar (`!isPost` branch):
- When `hasEnded` is true, render a single centered muted line "Este evento ha terminado" — no price, no capacity counter, no buy/join button.
- Exceptions kept: the owner still sees "Gestionar" (so they can manage the guestlist/attendees after the event), and users who already joined/paid still see "Ver entrada" so their ticket stays accessible. Everyone else sees only the ended message.

No backend or business-logic changes; purely presentation plus one derived boolean in the shared hook.

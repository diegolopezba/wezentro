# Business CTA Request — Notification Accept/Decline UI

Finish the only remaining piece of the feature: when a business sends a "Solicitar botones de menú/reserva" request, the post owner already gets a `business_cta_request` notification, but right now it renders with the generic fallback and has no Accept/Decline buttons. We'll add a dedicated notification item, mirroring the existing `PostTagNotificationItem` pattern.

## What changes

### New: `src/components/notifications/BusinessCtaRequestNotificationItem.tsx`
- Mirrors `PostTagNotificationItem` look (event thumbnail + body + time + inline Accept/Decline buttons).
- Pulls the pending request via `usePendingCtaRequestForOwner(eventId)` (already exists in `useBusinessCtaRequest.ts`).
- Uses `useRespondToBusinessCta()` mutation with `status: "accepted" | "declined"`.
- On success: toast (`"Botones activados"` / `"Solicitud rechazada"`) and `onRead()`.
- If no pending request is found (already responded/revoked), hide the action buttons and just show the message as a read-style entry.

### Edit: `src/pages/Notifications.tsx`
- Import the new component.
- Add cases to `renderNotification` switch:
  - `business_cta_request` → `BusinessCtaRequestNotificationItem`
  - `business_cta_accepted`, `business_cta_declined`, `business_cta_revoked` → fallback `NotificationItem` (informational, no actions)
- Extend `handleNotificationClick`: for all four `business_cta_*` types with `entity_id`, navigate to `/event/{entity_id}`.
- Add `business_cta_request` to `getNotificationIcon` → `Sparkles` (matches the request action icon in `TimelineCardCtaActions`).

## Out of scope
- No DB / RLS / trigger changes — the trigger already inserts all four notification types with `entity_type='event'` and the correct `entity_id`.
- No push-notification wiring changes — handled by the existing notifications → OneSignal flow.
- No new hooks — `usePendingCtaRequestForOwner` and `useRespondToBusinessCta` already exist.

## Files touched
- New: `src/components/notifications/BusinessCtaRequestNotificationItem.tsx`
- Edit: `src/pages/Notifications.tsx`

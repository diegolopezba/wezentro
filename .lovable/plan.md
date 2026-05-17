# Business CTA Requests on Tagged Posts

Lets a business that was tagged in a user's post (and approved to appear on their profile) request to attach their **menu** and **reservation** buttons to that post. The post owner must accept; either side can revoke afterward.

## User flow

1. **User A** posts a carousel and tags **Restaurant 1** (existing tag flow).
2. Restaurant 1 accepts the tag → post shows on their profile grid (existing).
3. Restaurant 1 long-presses the post in their profile grid → new quick-action **"Solicitar botones de menú/reserva"**.
   - Only shown if: viewer = tagged business, tag is accepted, business has `menu_enabled` or `reservations_enabled`, and no active/pending request exists.
4. User A receives an in-app + push notification: "Restaurant 1 quiere agregar sus botones de menú y reserva a tu publicación" with Accept / Decline.
5. On accept → the post displays the business's menu / reservation buttons (only those the business has enabled) to all viewers, in addition to the tag.
6. Either party can revoke later:
   - User A: long-press their own post → "Quitar botones de [Restaurant]".
   - Restaurant 1: long-press the post on their profile grid → "Quitar mis botones".

Only **one combined** request per (post, business) pair. Buttons rendered = intersection of (approved) AND (business's currently-enabled menu/reservation toggles), so if the business later turns reservations off globally, that button disappears automatically.

## Data model

New table `post_business_cta_requests`:

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| event_id | uuid | the post |
| business_id | uuid | requesting business (profiles.id) |
| requested_by | uuid | = business_id (kept explicit for audit) |
| status | text | `pending` / `accepted` / `declined` / `revoked` |
| created_at | timestamptz | |
| responded_at | timestamptz | |
| revoked_by | text | `user` / `business` / null |

Constraint: unique partial index on `(event_id, business_id)` where status in ('pending','accepted') so only one active row per pair.

Requirements enforced via trigger / check:
- An accepted `event_tags` row must exist for `(event_id, tagged_user_id = business_id)`.
- `business_id` must be a business profile (`profiles.is_business = true`).

### RLS
- SELECT: post owner, requesting business, plus public read of `accepted` rows so the post-detail page can render the buttons.
- INSERT: only the business itself, only when an accepted tag exists, no active row exists.
- UPDATE: post owner can accept/decline/revoke; business can revoke.

### Trigger
On insert (status=pending) and on update to accepted → insert into `notifications` (type `business_cta_request` / `business_cta_accepted`) + same path as existing tag notifications (push handled by current notification → OneSignal flow).

## Frontend

- **Profile grid quick-actions** (`src/components/events/EventCard.tsx` long-press menu, business path) — add "Solicitar botones" action when the viewer is a tagged business on someone else's post.
- **Post owner quick-actions** — add "Quitar botones de [business]" when an accepted request exists.
- **EventDetail / EventDetailModal** — when rendering CTAs, also pull accepted `post_business_cta_requests` for the post and render the corresponding business's menu / reservation buttons (reusing existing `MenuSheet` + `ReservationSheet`). Brand-red pill style, matches existing business CTAs memory.
- **Notification item** — new `business_cta_request` type with Accept / Decline buttons (mirror `post_tag` notification component).
- **Hook**: `useBusinessCtaRequest(eventId)` for the request row + mutations (`request`, `accept`, `decline`, `revoke`).

## Out of scope

- Multiple businesses per post (the table supports it, but UI only handles the tagged business case).
- Editing which of menu/reservation shows once accepted (it's automatic based on the business's current toggles).
- Analytics for these CTA clicks (uses existing event interaction tracking).

## Files touched (estimate)

- New migration: table + RLS + trigger + notification type.
- New: `src/hooks/useBusinessCtaRequest.ts`, `src/components/notifications/BusinessCtaRequestNotificationItem.tsx`.
- Edit: `src/components/events/EventCard.tsx` (quick actions), `src/pages/EventDetail.tsx` + `EventDetailModal.tsx` (CTA rendering), `src/pages/Notifications.tsx` (notification routing), `src/hooks/useNotifications.ts` (if type list).

## Goal
Add an **"Opciones avanzadas"** collapsible to the Create and Edit event screens with a **"Ubicación secreta"** toggle that any owner can flip independently of guestlist/price. Approved guests see the real address; everyone else sees a locked teaser. Reveal + change notifications use the existing in-app notifications system (no DMs).

## UX

**Create page** — new collapsible **"Opciones avanzadas"** at the bottom, collapsed by default. First option inside: `Ubicación secreta` switch with helper text *"Solo verán la dirección las personas que apruebes."*

**Edit event sheet** — same collapsible + toggle, so existing public events (like the user's current one) can be switched to secret afterwards.

**Viewing a secret-location event**
- Creator and approved guestlist members → see the real address + map, plus a small "Ubicación secreta" badge.
- Everyone else → address/map replaced by a locked card: lock icon, "Ubicación secreta", subtext *"La verás cuando el organizador te apruebe"*.
- Event cards / feed / map markers → show "Ubicación secreta" chip instead of `location_name` and skip the map pin for non-approved viewers.

**Notifications (no DMs)**
- **Approval on a secret event** → reuse the existing `guestlist_approved` notification. Tapping it opens the event detail page, where the location is now visible. No new notification type for this case.
- **Owner changes location on a secret event** → new notification type `secret_location_changed` sent to every currently approved guest. Title: *"Nueva ubicación secreta"*, body: *"{evento} cambió de ubicación"*. Tapping it opens the event detail page.

Both flow into the existing Notifications page; no chat/DM involvement.

## Technical

### Database migration
- `ALTER TABLE events ADD COLUMN is_location_secret boolean NOT NULL DEFAULT false`.
- `public.can_see_event_location(_user uuid, _event uuid) returns boolean` (SECURITY DEFINER, STABLE): true if event isn't secret, viewer is the creator, or viewer has an `approved` row in `guestlist_entries`.
- Trigger `trg_notify_secret_location_change` on `events` AFTER UPDATE: when `is_location_secret = true` AND (`location_name`, `latitude`, or `longitude` changed), insert one `secret_location_changed` notification per approved guest (`entity_type='event'`, `entity_id=event.id`).
- Update `public.get_for_you_events` (both overloads) to NULL out `location_name`, `latitude`, `longitude` when `e.is_location_secret` and `auth.uid()` isn't allowed by `can_see_event_location`.

### Frontend
- `src/pages/Create.tsx` — add `<Collapsible>` "Opciones avanzadas" with the `is_location_secret` switch; include the field in the event insert payload.
- `src/components/events/EditEventSheet.tsx` — same collapsible + toggle, hydrate from `event.is_location_secret`, include in save payload.
- `src/hooks/useEventMutations.ts` — add `is_location_secret?: boolean` to `UpdateEventData`.
- `src/hooks/useEventDetailState.ts` — expose `canSeeLocation` (creator OR approved guestlist row OR `!is_location_secret`).
- `src/pages/EventDetail.tsx` — when `!canSeeLocation`, render a small `LockedLocationCard` in place of the address row + map; show "Ubicación secreta" badge for the creator/approved viewer.
- `src/components/events/EventCard.tsx`, `TimelineCard.tsx`, `src/components/map/MiniEventMarker.tsx` / `MapView.tsx` — when `is_location_secret && !canSeeLocation`, show "Ubicación secreta" chip and skip the map pin.
- `src/hooks/useNotifications.ts` + notifications page item renderer — add icon/label for `secret_location_changed`, route tap to `/event/{id}`.
- `src/integrations/supabase/types.ts` regenerates after the migration.

### Files likely touched
- migration (column + helper function + trigger + `get_for_you_events` update)
- `src/pages/Create.tsx`
- `src/components/events/EditEventSheet.tsx`
- `src/hooks/useEventMutations.ts`
- `src/hooks/useEventDetailState.ts`
- `src/pages/EventDetail.tsx` (+ small `LockedLocationCard`)
- `src/components/events/EventCard.tsx`, `TimelineCard.tsx`
- `src/components/map/MiniEventMarker.tsx`, `src/components/map/MapView.tsx`
- `src/pages/Notifications.tsx` (or relevant notification item map)

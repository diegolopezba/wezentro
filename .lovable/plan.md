

# Plan: Remove tag pills from event detail, keep tagging as edit-only

## Goal
Eliminate the visible tagged-users pill row from event detail views. All backend tagging mechanics (notifications, accept/decline, profile feed visibility) remain fully intact. Owners continue to manage tags via the edit sheet.

## Files and changes

### 1. `src/pages/EventDetail.tsx`
- Remove the horizontal pill row that renders `eventTags` chips with avatar + `@username` + remove button.
- Remove now-unused imports: `useEventTags`, `useRemoveTag`, and the `eventTags` query call.

### 2. `src/components/events/EventDetailModal.tsx`
- Same removal — strip the matching tagged-users pill block from the overlay version, plus its now-unused imports/hooks.

### 3. `src/components/events/EditEventSheet.tsx`
- Verify the edit sheet already lets the owner add and remove tags. If yes → no change. If a remove control is missing, add a small "Personas etiquetadas" list with an ✕ button per tag using the existing `useEventTags` + `useRemoveTag` hooks.

## What stays (unchanged)
- `event_tags` table, RLS policies, all backend logic.
- Tag creation flow in event create/edit.
- `PostTagNotificationItem` — tagged users still get a notification with Aceptar / Rechazar buttons.
- `useUserTimeline` — accepted tagged posts still appear on the tagged user's profile feed.
- `MentionText` — `@username` mentions inside the description still render as blue tappable links for everyone.

## What's removed
- The horizontal pill row showing tagged users on the event detail page (full page + overlay).
- Public visibility of who is tagged from the event detail view.

## Technical notes
- Clean up any leftover imports tied only to the removed UI to avoid TS warnings.
- No DB migration, no edge function changes.


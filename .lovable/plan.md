

# Notifications System Audit and Enhancement Plan

## Current State

The app has **13 notification types** with database triggers, but only **6 have custom UI components**. The remaining 7 types (repost, collaboration_accepted, referral_signup, new_reservation, reservation_cancelled, reservation_tagged, event_reminder) fall through to a generic renderer that shows raw title/body text without avatars or rich formatting.

## What Needs Fixing

### 1. Custom UI Components for Existing Types

These types already have triggers but use the generic fallback -- they need dedicated, polished UI components:

- **repost** -- Show reposter's avatar + "reposted your post" with event thumbnail
- **collaboration_accepted** -- Show collaborator's avatar + "accepted your collaboration" with event thumbnail
- **referral_signup** -- Show referred user's avatar + progress indicator (e.g., "3/5 for your free month")
- **new_reservation** -- Show customer's avatar + reservation details (date, party size)
- **reservation_cancelled** -- Show who cancelled + reservation details
- **reservation_tagged** -- Show who tagged you + business name and date

### 2. Missing Notification Types to Add

These are interactions that currently generate no notification at all:

- **`like`** -- When someone likes your event/post. This is a standard social feature users expect. Requires a new database trigger on the `event_likes` table.
- **`event_reminder`** -- Reminders before events you joined (24h and 2h before start). The memory mentions this feature but no trigger or scheduled job exists. This requires a backend function (cron or scheduled task) to check upcoming events and create reminder notifications.

### 3. Navigation Fixes

Some notification types don't have proper navigation handlers in the click handler:
- `repost` -- should navigate to the event
- `collaboration_accepted` -- should navigate to the event
- `referral_signup` -- should navigate to the referrals page
- `reservation_tagged` -- already handled but could link to MyReservations

## Technical Implementation

### Phase 1: New "like" notification trigger

Create a database migration with a trigger on `event_likes` that:
- Looks up the liker's username
- Looks up the event creator and title
- Skips if user likes their own event
- Inserts a notification with type `like`

### Phase 2: Custom UI components

Create dedicated notification item components for each type that currently uses the generic fallback. Each will:
- Show the relevant user's avatar (fetched by username extracted from body)
- Display a formatted Spanish message
- Show event thumbnail where relevant
- Include proper timestamp

### Phase 3: Navigation handler updates

Update `handleNotificationClick` to route each type correctly:
- `like` -> event detail page
- `repost` -> event detail page  
- `collaboration_accepted` -> event detail page
- `referral_signup` -> referrals page

### Phase 4: Event reminders (separate scope)

Event reminders require a scheduled backend function (cron job) that periodically scans for upcoming events and sends notifications. This is a larger feature and could be done as a follow-up.

## Summary of Changes

| File | Change |
|---|---|
| New migration SQL | Add `like` notification trigger on `event_likes` |
| `src/pages/Notifications.tsx` | Add `like` icon, add dedicated components for repost/collaboration_accepted/referral/reservation types, update navigation handler |
| New component files (optional) | Extract complex notification items into separate files for cleanliness |
| `src/pages/Notifications.tsx` | Update `getNotificationIcon` with `like` (Heart icon) |

**Estimated scope:** ~6 new/updated notification item renderers, 1 new DB trigger, navigation fixes.

**Out of scope for now:** Event reminders (requires cron infrastructure), message notifications (handled by chat badges).


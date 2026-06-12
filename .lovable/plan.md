## Problem

Saving a new location on an event with secret location enabled fails with:
`new row for relation "notifications" violates check constraint "notifications_type_check"`

The `notifications.type` column has a CHECK constraint with a hardcoded list of allowed values. When the trigger `notify_secret_location_change` tries to insert a `secret_location_changed` notification, the constraint rejects it because that type was never added to the list.

The same list is also missing the `business_cta_request`, `business_cta_accepted`, `business_cta_declined`, and `business_cta_revoked` types that already exist in the codebase and triggers — those are latent bugs that will hit users next.

## Fix

Run one migration that drops and recreates `notifications_type_check` to include all currently used notification types:

- existing: `follow`, `guestlist_request`, `guestlist_approved`, `guestlist_rejected`, `guestlist_invitation`, `repost`, `collaboration_request`, `collaboration_accepted`, `referral_signup`, `new_reservation`, `reservation_cancelled`, `reservation_tagged`, `post_tag`, `like`, `comment`
- add: `secret_location_changed`, `business_cta_request`, `business_cta_accepted`, `business_cta_declined`, `business_cta_revoked`

No frontend changes required — `Notifications.tsx` already handles `secret_location_changed`.

## Verification

After the migration, edit a secret-location event's address in the Edit sheet. Saving should succeed, and approved guests should receive a "Nueva ubicación secreta" notification that links to the event detail.
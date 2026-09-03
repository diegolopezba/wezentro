# Delete the "quiere unirse a tu evento" notification

## Diagnosis (confirmed)

- The notification shown as "username quiere unirse a tu evento" is the `guestlist_request` type, rendered by `GuestlistRequestNotificationItem` in `src/pages/Notifications.tsx`.
- It is created by the database trigger `on_guestlist_request` (function `handle_guestlist_request`), which fires on **every** `INSERT` into `guestlist_entries` (migration `20251217025913`).
- Since buying a ticket, claiming a free tier, or a lounge's included tickets all insert into `guestlist_entries`, the owner gets a "wants to join" notification even though the user already joined — the message is wrong for purchases.

## Changes

1. **Migration `0022_drop_guestlist_request_trigger.sql`**
   - `DROP TRIGGER IF EXISTS on_guestlist_request ON guestlist_entries;`
   - `DROP FUNCTION IF EXISTS public.handle_guestlist_request();`
   - This stops the notification at the source for all insert paths (purchases, free claims, lounge included tickets).
2. **Hide existing ones from the notifications list**
   - Add `"guestlist_request"` to `HIDDEN_NOTIFICATION_TYPES` in `src/hooks/useNotifications.ts` so already-created rows no longer appear.
   - Leave the `GuestlistRequestNotificationItem` component and rendering switch untouched (dead but harmless; removing is optional cleanup).

## Notes

- No other notification types are affected (`guestlist_approved`, `guestlist_invitation`, etc. remain).
- The `guestlist_joined` push notification in `useGuestlist.ts` is separate and stays as-is.

## Verification

- Apply migration, run typecheck, and confirm a ticket purchase no longer creates a `guestlist_request` notification.

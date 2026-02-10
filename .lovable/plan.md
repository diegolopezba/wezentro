

## Fix: Update `notifications_type_check` constraint

The previous fix updated the `entity_type` constraint, but there's a separate constraint on the `type` column (`notifications_type_check`) that also needs to include the reservation-related notification types.

The `handle_new_reservation` trigger inserts notifications with `type = 'new_reservation'`, and the `handle_reservation_status_change` trigger uses `type = 'reservation_cancelled'`. Neither value is currently allowed by the constraint.

### Database Migration

Update the `notifications_type_check` constraint to add:
- `new_reservation`
- `reservation_cancelled`
- `reservation_tagged`

```sql
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'follow', 'guestlist_request', 'guestlist_approved', 'guestlist_rejected',
  'guestlist_invitation', 'repost', 'collaboration_request', 'collaboration_accepted',
  'referral_signup', 'new_reservation', 'reservation_cancelled', 'reservation_tagged'
));
```

No code changes needed -- only this one database constraint update.



## Root Cause

The `notifications_type_check` constraint on the `notifications` table was last updated in migration `20260212193723` and it is **missing `'like'`** from its allowed type list. The `handle_new_like()` database trigger fires on every like and inserts a row with `type = 'like'` — but the constraint rejects it, causing the error.

The full allowed list in the live constraint:
```
follow, guestlist_request, guestlist_approved, guestlist_rejected,
guestlist_invitation, repost, collaboration_request, collaboration_accepted,
referral_signup, new_reservation, reservation_cancelled, reservation_tagged, post_tag
```

Missing: `like`

### Fix

One migration that drops and recreates the constraint with `'like'` added back:

```sql
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'follow', 'guestlist_request', 'guestlist_approved', 'guestlist_rejected',
    'guestlist_invitation', 'repost', 'collaboration_request', 'collaboration_accepted',
    'referral_signup', 'new_reservation', 'reservation_cancelled', 'reservation_tagged',
    'post_tag', 'like'
  ]));
```

### Files Changed
| File | Change |
|---|---|
| New migration | Add `'like'` back to `notifications_type_check` constraint |

No code changes required — the trigger and frontend hooks are already correct. This is a pure database fix.

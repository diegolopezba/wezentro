
## Full Notification Type Inventory

All 13 types in the system:

| Type | Component | Action buttons today |
|---|---|---|
| `follow` | `FollowNotificationItem` (inline) | ✗ Check icon (unread) |
| `like` | `LikeNotificationItem` | ✗ Check icon (unread) |
| `repost` | `RepostNotificationItem` | ✗ Check icon (unread) |
| `guestlist_request` | `GuestlistRequestNotificationItem` (inline) | ✗ Check icon (unread) → **should navigate to guestlist manage sheet** |
| `guestlist_approved` | `GuestlistStatusNotificationItem` (inline) | ✗ Check icon (unread) |
| `guestlist_rejected` | `GuestlistStatusNotificationItem` (inline) | ✗ Check icon (unread) |
| `guestlist_invitation` | `GuestlistInvitationNotificationItem` (inline) | ✓ Accept/Decline (correct — keep) |
| `collaboration_request` | `CollaborationNotificationItem` (inline) | ✓ Accept/Decline (correct — keep) |
| `collaboration_accepted` | `CollaborationAcceptedNotificationItem` | ✗ Check icon (unread) |
| `referral_signup` | `ReferralNotificationItem` | ✗ Check icon (unread) |
| `new_reservation` | `ReservationNotificationItem` | ✗ Check icon (unread) |
| `reservation_cancelled` | `ReservationNotificationItem` | ✗ Check icon (unread) |
| `reservation_tagged` | `ReservationNotificationItem` | ✗ Check icon (unread) |
| `post_tag` | `PostTagNotificationItem` | ✓ Accept/Decline (keep — user can accept/decline being tagged) |

---

## What Needs to Change

### 1. Remove the Check icon button from all "passive" notifications
The `<Button><Check /></Button>` + unread dot is shown on unread items purely to mark them as read. The user finds this confusing and unnecessary. The unread dot alone is sufficient — clicking the notification already marks it read.

**Remove the `<Button><Check /></Button>` block from:**
- `FollowNotificationItem` (inline in `Notifications.tsx`)
- `LikeNotificationItem`
- `RepostNotificationItem`
- `CollaborationAcceptedNotificationItem`
- `ReferralNotificationItem`
- `ReservationNotificationItem`
- `GuestlistStatusNotificationItem` (inline in `Notifications.tsx`)

Keep only the unread indicator dot (`<div className="w-2 h-2 rounded-full bg-primary shrink-0" />`).

Also remove from `GuestlistRequestNotificationItem` — it gets replaced by the navigate behavior below.

Also remove from `GuestlistInvitationNotificationItem` — already conditionally hidden (`!notification.is_read && !invitation`), but clean it up.

### 2. `guestlist_request` — navigate to guestlist management sheet
When the owner taps "X wants to join your event", they should land directly on the event detail page with the guestlist management sheet open.

The `EventDetail` page already has a `GuestlistManagementSheet`. Looking at the `handleNotificationClick` function, `guestlist_request` currently has no navigation case (falls through to the generic `entity_type === "event"` check at the bottom, which navigates to `/event/:id`). 

**Fix**: Add a dedicated case in `handleNotificationClick`:
```ts
} else if (notification.type === "guestlist_request" && notification.entity_id) {
  navigate(`/event/${notification.entity_id}`, { state: { openGuestlist: true } });
}
```

Then in `src/pages/EventDetail.tsx`, read `location.state?.openGuestlist` and auto-open the `GuestlistManagementSheet` on mount.

---

## Files to Change

| File | Change |
|---|---|
| `src/pages/Notifications.tsx` | Remove Check button from `FollowNotificationItem`, `GuestlistRequestNotificationItem`, `GuestlistStatusNotificationItem` inline components; add `guestlist_request` navigation with `state: { openGuestlist: true }` |
| `src/components/notifications/LikeNotificationItem.tsx` | Remove Check button, keep unread dot |
| `src/components/notifications/RepostNotificationItem.tsx` | Remove Check button, keep unread dot |
| `src/components/notifications/CollaborationAcceptedNotificationItem.tsx` | Remove Check button, keep unread dot |
| `src/components/notifications/ReferralNotificationItem.tsx` | Remove Check button, keep unread dot |
| `src/components/notifications/ReservationNotificationItem.tsx` | Remove Check button, keep unread dot |
| `src/pages/EventDetail.tsx` | Read `location.state?.openGuestlist`, auto-open `GuestlistManagementSheet` |

**Not changed:** `CollaborationNotificationItem` (keeps Accept/Decline — correct), `GuestlistInvitationNotificationItem` (keeps Accept/Decline — correct), `PostTagNotificationItem` (keeps Accept/Decline — correct).

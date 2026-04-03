

## Remove "@" prefix from usernames everywhere except tags/mentions

The `@` symbol should only appear when someone is **tagged** (e.g. in event tags, mentions in descriptions, "Respondiendo a @user"). All other username displays should show just the plain username.

### Changes across 18 files

**Keep `@` (tag/mention contexts):**
- `src/pages/EventDetail.tsx` line 252 — event tag badges ✓ keep
- `src/components/events/CommentsSheet.tsx` line 129 — "Respondiendo a @user" ✓ keep
- `src/components/ui/MentionText.tsx` — rendered mentions ✓ keep
- `src/components/notifications/PostTagNotificationItem.tsx` — tag notifications ✓ keep

**Remove `@` from these files:**

| File | Line(s) | Context |
|---|---|---|
| `src/components/events/CommentItem.tsx` | 102 | Comment author username |
| `src/components/events/GuestlistManagementSheet.tsx` | 300 | Guestlist request username |
| `src/components/events/ShareEventModal.tsx` | 171 | Share user list |
| `src/components/events/ShareGuestlistModal.tsx` | 155 | Share guestlist user list |
| `src/components/events/InviteFriendsSheet.tsx` | 219 | Invite friends user list |
| `src/components/events/InvitationsSentSection.tsx` | 95 | Sent invitations list |
| `src/pages/EventDetail.tsx` | 308 | Latest comment preview |
| `src/pages/Notifications.tsx` | 76, 127, 256, 306 | Follow, guestlist request, invite, comment notifications |
| `src/pages/ReservationConfirmation.tsx` | 140 | Guest username |
| `src/pages/MyReservations.tsx` | 137 | Business username |
| `src/pages/ScanQR.tsx` | 318 | Scanned guest username |
| `src/pages/Referrals.tsx` | 239 | Referred user |
| `src/components/notifications/LikeNotificationItem.tsx` | 58 | Like notification |
| `src/components/notifications/RepostNotificationItem.tsx` | 58 | Repost notification |
| `src/components/notifications/ReferralNotificationItem.tsx` | 63 | Referral notification |
| `src/components/profile/FollowersSheet.tsx` | 71 | Follower username |
| `src/components/search/UserSearchResultCard.tsx` | 33 | Search result |
| `src/components/chat/NewChatModal.tsx` | 91 | New chat user list |
| `src/components/map/FoodMarker.tsx` | 63 | Food marker username |
| `src/components/dashboard/AudienceInsights.tsx` | 65, 67 | Recent followers |
| `src/components/dashboard/ReservationsSummary.tsx` | 89 | Reservation username |
| `src/components/reservations/ReservationSheet.tsx` | 378, 416 | Guest/user list |
| `src/components/reservations/ReservationsManagementSheet.tsx` | 155 | Reservation user |

Each change is simply removing the `@` character before the username interpolation — a one-character deletion per instance. No logic changes needed.


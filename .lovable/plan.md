
# Guestlist Virality Loop -- Option A

## What It Does
After a user successfully joins a guestlist (free join or paid/QR payment), a bottom sheet (Drawer) slides up on the same event detail page prompting them to invite friends. The sheet shows a celebratory message and a list of mutual followers they can quickly invite.

## User Flow

```text
User taps "Unirse" (or completes QR payment)
        |
        v
  Join succeeds
        |
        v
  Bottom sheet slides up:
  +-----------------------------+
  | "Estas dentro!"              |
  | Invite friends to go with you|
  |                             |
  | [Search bar]                |
  | [ ] @friend1                |
  | [ ] @friend2                |
  | [ ] @friend3                |
  |                             |
  | [Invitar (2)]    [Ahora no] |
  +-----------------------------+
```

## Technical Details

### 1. New Component: `src/components/events/InviteFriendsSheet.tsx`
- Uses the existing `Drawer` (vaul) component for a native bottom sheet feel
- Props: `eventId`, `eventTitle`, `open`, `onOpenChange`
- Reuses `useMutualFollowers` from `useChats` for the friend list
- Reuses `useSearchUsers` for business users who can search all users
- Reuses `useSendGuestlistInvitations` hook for sending invites
- Reuses `useEventInvitations` to exclude already-invited users
- Reuses `useEventGuestlist` to exclude users already on the guestlist
- Shows a celebratory header with confetti-style icon and event title
- Displays mutual followers with checkboxes (same pattern as `ShareGuestlistModal`)
- "Invitar" button to send and "Ahora no" / swipe-down to dismiss
- Business users get a search bar to find any user; regular users filter mutual followers

### 2. Modify `src/components/events/EventDetailOverlay.tsx`
- Add `showInviteFriendsSheet` state (boolean, default false)
- After `joinGuestlist.mutateAsync` succeeds (line ~214-215): replace the toast with `setShowInviteFriendsSheet(true)`
- After `joinGuestlistWithPayment.mutateAsync` succeeds (line ~223): also set `setShowInviteFriendsSheet(true)`
- Render `<InviteFriendsSheet>` at the end of the component JSX

### 3. Modify `src/pages/EventDetail.tsx`
- Same changes as above: add state, trigger after join, render the sheet

### 4. No Database Changes
The existing `guestlist_invitations` table and `useSendGuestlistInvitations` hook handle everything. No new tables, migrations, or RLS policies needed.

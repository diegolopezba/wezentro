## Goal

Fix the Notifications page so it feels instant on mount (like Instagram): only render what's on screen, and clean up the "unread" visual language.

## Current problems

- The page renders **every** notification at once. Each item mounts its own hooks (`useEvent`, `useQuery` for profile-by-username, `useUserProfile`, `useMyPendingInvitations`, etc.). With 50–200 rows this fires dozens of parallel Supabase queries at mount, blocks scroll, and causes the multi-second "loading" the user sees.
- A staggered framer-motion entrance (`delay: index * 0.03`) compounds it: 100 items = 3s of animation lag before the last row appears.
- Unread state is visually noisy and inconsistent: a full `bg-primary/5` tint on the row, a red dot on the right, and in some items also a "check" button. Instagram uses a much lighter treatment — a small unread dot on the right, and rows fade to "read" once seen.

## Fix — Phase 1: Virtualize (row-windowing, Instagram-style)

Rewrite the list section of `src/pages/Notifications.tsx` using `@tanstack/react-virtual` (already installed):

- Wrap the scroll area in a container ref; use `useVirtualizer` with `estimateSize: 88`, `overscan: 6`.
- Render only the visible window (typically 8–12 rows) + 6 overscan. Each notification item's hooks only fire when it actually mounts — matching Instagram's on-demand fetch behavior.
- Use `measureElement` so variable-height rows (invitation cards with action buttons, referral progress bar) size correctly.
- Keep pull-to-refresh behavior compatible by using `window` as the scroll element (page-level scroll, not a nested scroller) via `useWindowVirtualizer`. This preserves the existing sticky header and iOS momentum scroll.
- Cap the entrance animation delay at `Math.min(index, 8) * 0.02` so late rows don't stagger.

## Fix — Phase 2: Instagram-style unread treatment

- Drop the `bg-primary/5` row tint. Instagram doesn't tint whole rows.
- Replace the red dot + the per-item "Check" button with a single **small unread dot** (6px) on the right edge of every unread row. No manual "mark as read" button — Instagram auto-marks on view.
- **Auto-mark-as-read on view**: when a row is scrolled into view (via the virtualizer's visible range), fire `markRead` for unread items after a 500ms dwell. Batch into a single mutation per tick to avoid a query storm. Removes the need for the manual check button entirely.
- Header: remove the dead `{unreadCount > 0}` expression; the bell icon in the app already carries the global unread badge.
- Text weight becomes the primary unread cue (semibold vs regular), matching Instagram.

## Fix — Phase 3: Reduce per-item query fan-out

Small, contained cleanup to keep virtualization fast:

- The `profile-by-username` query is duplicated across Like/Repost/Referral/GuestlistRequest/Comment/Reservation items. Keep the query key stable (`["profile-by-username", username]`) — already the case — so react-query dedupes across rows.
- Add `staleTime: 5 * 60 * 1000` to those per-item queries so re-mounts during scroll don't re-fetch.

## Out of scope

- No changes to notification data model, realtime subscription, or push flow.
- No changes to how notifications are grouped (Instagram groups "X and 3 others liked…"; that's a separate future phase).

## Files touched

- `src/pages/Notifications.tsx` — virtualize list, remove tint + check button, auto-mark-on-view.
- `src/components/notifications/*.tsx` (Like/Repost/Referral/Reservation/BusinessCtaRequest/PostTag) — drop row tint, replace right-side red dot with the shared small unread dot, add `staleTime` to their profile queries.

## Verification

- Load Notifications with 50+ rows; confirm initial paint shows rows immediately and scroll is not blocked.
- Scroll to bottom; confirm rows above unmount (check React DevTools or a console log in one item) and rows below mount on demand.
- Confirm unread rows lose their dot after being visible ~500ms and the count in the bell badge decreases accordingly.
- Confirm pull-to-refresh, back button, and deep-link navigation from a notification still work.

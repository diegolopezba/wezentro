# Tier A Cleanup

Targeted fixes from the 360° audit. No feature changes, no schema changes.

## 1. Hide legacy `guestlist_join_request` notifications
- In `src/hooks/useNotifications.ts`, filter out notifications whose `type = 'guestlist_join_request'` at the query level so stale rows for the removed self-join feature never render.
- Leave existing rows in DB (no destructive deletion) — just hidden from UI.

## 2. Hide event-type group chats
- In `src/pages/Chats.tsx`, filter `chats` to exclude `chat.type === 'event'` before rendering the list.
- In `src/hooks/useChats.ts`, also exclude event chats from `useUserChats` results and from the unread-count aggregation so the bottom-nav badge stays accurate.
- In `src/pages/ChatDetail.tsx`, if a user lands on an event chat via deep link, redirect to `/chats` (event chats are no longer user-facing).
- Keep DB rows and edge-function logic intact — only the user-facing surface is hidden, matching the prior group-chat removal pattern.

## 3. Fix `MyReservations.tsx:134` short-circuit navigation
- Replace `condition && navigate(...)` with a proper `if (condition) navigate(...)` block to clear the lint warning and avoid accidental render-time side effects.

## 4. Convert `tailwind.config.ts` to ESM
- Replace `require("tailwindcss-animate")` with a top-level `import tailwindcssAnimate from "tailwindcss-animate"` and reference it in the `plugins` array.

## 5. Fix `useEffect` dependency warnings
- `src/pages/ChatDetail.tsx:36` — add `markAsRead` to the deps array (or wrap the mutation call so it's stable) for the "mark as read on open" effect.
- `src/pages/Discover.tsx:78` — add missing deps flagged by the linter (will read the file to confirm exact set).
- `src/pages/EventDetail.tsx:96` — same: add missing deps or memoize the callback being depended on.

## Out of scope (intentionally)
- Public storage bucket review (`event-images`) — needs product decision, will surface separately.
- `SECURITY DEFINER` linter warnings — expected for `has_role` / RLS helpers, no change.
- 200+ `no-explicit-any` ESLint warnings — codebase-wide cleanup, not Tier A.
- Lighthouse run on production URL — separate pass.

## Verification
- TypeScript compile after edits.
- Manually confirm `/chats` no longer shows event group chats and `/notifications` no longer shows `guestlist_join_request` entries.
- Spot-check ESLint output on the four touched files.

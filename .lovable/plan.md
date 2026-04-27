# QA Plan: Verify Cost Optimizations

Purpose: confirm the 4 optimization changes (caching, narrow queries, image optimization, lazy Mapbox) work end-to-end with no regressions.

## 1. Static checks (fast, no risk)

- Run `tsc --noEmit` to confirm no type regressions from narrowed `select()` calls and the new `AvatarImage.size` prop.
- Run `rg` to find any remaining `<AvatarImage>` usages that pass a `size` prop incorrectly or any leftover `staleTime: 0` in high-traffic hooks.
- Tail `/tmp/dev-server-logs/dev-server.log` for build warnings.

## 2. Live preview verification (browser tool)

Walk through the 4 user-facing surfaces affected:

| Surface | What to verify | How |
|---|---|---|
| **Home feed** | Cards render, avatars load, no broken images | Navigate `/`, screenshot, scroll |
| **Notifications** | List loads with correct fields (title, body, is_read), avatars show | Navigate `/notifications` |
| **Chats list** | Chats render with last message + unread counts | Navigate `/chats` |
| **Discover map** | Map lazy-loads (Suspense fallback briefly visible), tiles render, zoom capped at 16 | Navigate `/discover`, open map, pinch-zoom |
| **Event detail** | Comments load, avatars + optimized images appear | Open any event card |

## 3. Network verification (browser network panel)

While on the home feed and Discover:
- Confirm Supabase storage image requests now include `?width=...&quality=75&resize=cover`.
- Confirm Mapbox tiles only fire **after** Discover route is opened (not on initial app load).
- Confirm notifications query payload no longer returns extra columns (push_sent_at, etc.).

## 4. Regression watch — known risk areas

- `AvatarImage` rewrites Supabase Storage URLs only. Lovable-uploads + external URLs must pass through unchanged. Spot-check a profile that uses a non-Storage avatar.
- `useUserReservations` was narrowed; verify `MyReservations` page still renders all fields it needs.
- `useNotifications` narrowed columns; verify each notification type renderer (Like, Repost, Comment, Reservation, etc.) still has the data it expects.
- Discover map: confirm lazy import doesn't break the auto-open behavior on first visit.

## 5. Reporting

After the run, return a short pass/fail table per surface plus screenshots of:
- Home feed
- Notifications
- Discover map (loaded)
- Event detail with comments

If any regression is found, I'll diagnose and fix before declaring green.

## Notes

- All checks are read-only on data; no destructive actions on the live DB.
- Browser tool will be used (you've asked me to test), one short session.

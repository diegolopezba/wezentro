## Goal

Match IG Reels / TikTok behavior: the eye-icon view count pill appears on the bottom-right of each card **only on profile timeline grids** — both the logged-in user's own `/profile` and any other user's `/user/{userId}`. It stays hidden everywhere else (main feed, Más como esto, map, chat, saved, joined, search).

## Current state

- The pill is already implemented in `TimelineCard` and renders only when a `viewCount` prop is passed.
- `Profile.tsx` already passes `viewCount` (via `useUserTimeline`, which calls the `get_event_card_counts` RPC).
- `UserProfile.tsx` (other users' profiles) does **not** pass it — its data hook doesn't fetch impression counts.

## Changes

1. **`src/hooks/useUserProfile.ts`** (or whichever hook `UserProfile.tsx` uses to fetch the other-user timeline — confirm during implementation): after fetching the timeline items, batch-call the existing `get_event_card_counts` RPC with all event ids and attach `view_count` to each item, mirroring the logic already in `useUserTimeline.ts`.

2. **`src/pages/UserProfile.tsx`**: pass `viewCount={item.view_count}` into each `TimelineCard`, same as `Profile.tsx` does.

No other call sites change. No DB schema changes. No edits to `EventCard`, `RelatedEventsFeed`, map, chat, saved, joined, or search — they continue to render `TimelineCard` / `EventCard` without `viewCount`, so the pill stays hidden.

## Privacy note

`get_event_card_counts` already returns aggregate impression totals and is safe to expose publicly (counts only, no per-viewer identity), matching IG/TikTok where anyone visiting a profile sees the same public view count the creator sees.

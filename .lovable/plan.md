## Research: how IG/TikTok actually count views

| Rule | TikTok | Instagram (Reels/Plays) | What we'll mirror |
|---|---|---|---|
| Trigger for video | 0s — as soon as playback starts | 0s — "Plays" starts at millisecond 1 | **Video: on play start** |
| Trigger for image | n/a | Visible in viewport | **Image/carousel: ≥50% visible for ~500ms** (current behavior — keep) |
| Repeat views by same user | Counted (rewatches + loops) | Counted as "Replays" | **Count repeats**, but throttle to avoid loop-spam (see below) |
| Creator's own views | Excluded | Excluded | **Exclude** |
| Logged-out users | Counted | Counted | **Count** (anon viewer, no user id) |
| Public display | Public total | Public on Reels | **Public count under each card** (already done) |

Sources: TikTok Ads Help (video play metrics), Instagram Business Help (Reels insights), Meta Ads impression standards, TikTok Creator Rewards qualified-view rules.

## Why views are missing today

`useImpressionTracker` is mounted **only on `TimelineCard`** (profile timelines). The main feed (`EventCard`) never fires impressions, so almost nothing accumulates views and the badge — which only shows when `viewCount > 0` — stays hidden. The like button at `bottom-left` vs views badge at `bottom-right` do **not** collide; layout was a red herring.

## Plan

### 1. Track impressions everywhere a card is shown
- `src/components/events/EventCard.tsx` — mount `useImpressionTracker(id, { creatorId, mediaType })`, attach ref to the outer wrapper.
- `src/components/events/TimelineCard.tsx` — pass `creatorId` and `mediaType` into the existing hook call.
- Skip when `isSponsored` (sponsored has its own impression pipeline via `increment_sponsored_impressions`).

### 2. Mirror IG/TikTok trigger rules in `useImpressionTracker`
Update `src/hooks/useImpressionTracker.ts` to accept `{ creatorId?, mediaType?: "image" | "video" }`:
- **Image / carousel**: keep current rule — IntersectionObserver, ≥50% visible for **500ms** (matches IG image impression intent and prevents scroll-spam).
- **Video**: fire on **playback start** (0s) — wire `MediaCarousel` to emit a `onPlay` callback the first time the active video element fires `playing`, then the hook records the view. This matches TikTok and IG Plays exactly.
- **Exclude self-views**: skip firing when `user?.id === creatorId`.
- **Logged-out users**: keep counting — `trackEventImpression` already tolerates an anonymous viewer id (verify and pass `null` instead of skipping when `!user`).
- **Repeat-view throttle**: allow re-fires across mounts (already the case since `firedRef` resets on `id` change), but inside a single mount fire only once per 30s to avoid loop replays inflating counts on autoplaying feed videos. This is a gentle interpretation of TikTok "rewatch" — still counts repeats, just not 60 plays from a 1s looping clip.

### 3. No DB / no UI / no layout change
- `event_interactions` table + `get_event_card_counts` RPC already handle `impression` rows. No migration.
- Views badge stays bottom-right; like stays bottom-left.
- No edge function changes.

## Files touched

- `src/hooks/useImpressionTracker.ts` — add `creatorId` + `mediaType` options, video-on-play path, 30s in-mount throttle, allow anon.
- `src/components/events/EventCard.tsx` — mount hook + ref, wire `MediaCarousel onPlay`.
- `src/components/events/TimelineCard.tsx` — pass `creatorId` + `mediaType`, wire `MediaCarousel onPlay`.
- `src/components/events/MediaCarousel.tsx` — expose `onFirstPlay` callback fired the first time the active `<video>` reports `playing`.

## Out of scope

- Splitting impression vs play in the public count (we'll keep one combined "views" number for now, like IG does on Reels).
- Bot/fraud filtering — not needed at current scale.
- Discover / related feeds — same hook will drop in there later if you want.

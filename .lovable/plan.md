
## Goal

In every feed (Para Ti, Siguiendo, Discover, profile timelines, related, etc.), video cards should:
1. Autoplay only when on screen, pause when off screen.
2. Have sound **on** — but only on the single video that is closest to the top of the viewport at any moment. All other on-screen videos play muted.
3. Switch the "sound holder" smoothly as the user scrolls.

## Pinterest reference (what they actually do)

From Pinterest's own help docs and engineering posts:
- Videos start playing when **≥50% of the pin is on screen** (IntersectionObserver-style threshold).
- Only **one video plays audio at a time**; the rest in the grid stay muted. The "audio-active" pin is the most-visible / topmost pin, and it switches as you scroll.
- Per-video mute toggle remains available; muting one pin does not affect others.
- A user setting lets people disable autoplay entirely.

We will mirror points 1–3. We will NOT add a global setting in this pass (can be added later).

## Important platform caveat

Mobile browsers (iOS Safari, Android Chrome) **block autoplay with sound** until the user has interacted with the page at least once. Capacitor WebView behaves the same. So:
- Videos start muted on first paint.
- As soon as the user taps/scrolls anywhere in the app, we "unlock" audio and the topmost on-screen video becomes unmuted.
- This matches Instagram Reels / TikTok web behavior and is the only compliant approach.

## Design

### 1. New `FeedVideoCoordinator` (singleton)

`src/lib/feedVideoCoordinator.ts`

- Registry of mounted feed `<video>` elements with their current `IntersectionObserverEntry` data (visibility ratio + bounding rect top).
- Exposes `register(id, el)` / `unregister(id)` / `updateVisibility(id, ratio, topY)`.
- On each visibility change (debounced via rAF):
  - Play any video with ratio ≥ 0.5; pause + reset others.
  - Among playing videos, pick the one with the **smallest `bounding.top` ≥ 0** (closest to top of viewport, fully or mostly in view). That one gets `muted = false`; all others get `muted = true`.
- Tracks a global `audioUnlocked` flag. Until the first user gesture (`pointerdown` / `touchstart` once), all videos remain muted regardless of position. After unlock, the topmost rule applies.
- Respects a per-card user override: if the user taps the existing sound toggle on a card to mute, that card is pinned-muted and skipped by the audio-selection logic until it leaves the viewport.

### 2. New `useFeedVideo` hook

`src/hooks/useFeedVideo.ts`

- Takes a ref to the `<video>` element and a stable id.
- Sets up a single shared `IntersectionObserver` (thresholds `[0, 0.25, 0.5, 0.75, 1]`) and forwards entries to the coordinator.
- Cleans up on unmount.

### 3. Wire `MediaCarousel` into the coordinator

`src/components/events/MediaCarousel.tsx`

- For each `<video>` slide that is the **active carousel slide**, register with the coordinator using a stable id (`${cardId}-${slideIndex}`).
- Remove the current "autoplay first slide / pause others / local isMuted state" logic and let the coordinator drive `play/pause/muted`.
- Keep the existing sound toggle button, but route it through the coordinator (per-card override). When user toggles, also mark audio as "unlocked".
- Non-active carousel slides do not register (so swiping inside a card still pauses the previous slide — same as today).
- `isHero` (detail view) keeps current behavior — coordinator is feed-only. We pass an `inFeed` prop (default `true`); `EventDetail` already passes `isHero` and will pass `inFeed={false}`.

### 4. No changes needed in card components

`EventCard`, `TimelineCard`, `RelatedEventsFeed`, etc. all already render through `MediaCarousel`, so the behavior change is automatic across every feed.

### 5. Audio-unlock listener

Mounted once in `MediaCarousel` (or in `AppLayout`) as a one-shot `pointerdown` listener that calls `coordinator.unlockAudio()` and removes itself.

## Files to change

- **New** `src/lib/feedVideoCoordinator.ts` — singleton logic.
- **New** `src/hooks/useFeedVideo.ts` — IntersectionObserver wiring.
- **Edit** `src/components/events/MediaCarousel.tsx` — replace local play/mute logic with coordinator for active feed slides; keep hero/detail behavior intact; route sound toggle through coordinator.

No DB / RLS / edge-function changes.

## Verification

- Scroll Home feed with 2+ video posts visible at once: both play, only the topmost has sound.
- Scroll so a different video becomes topmost: audio switches to it within ~100ms, previous one goes muted (not paused).
- Scroll a video fully off screen: it pauses and resets to 0.
- First app load: all videos muted until first tap/scroll; after that, topmost gets audio.
- Open event detail: hero video still respects its own mute button (unchanged).
- Tap mute on a card: that card stays muted even when topmost; next topmost video gets audio.

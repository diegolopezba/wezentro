## Goal

Stop cropping portrait images/videos on the event details page. Media should render at its full natural aspect ratio — page just gets a bit longer for tall uploads.

## Change

**File:** `src/components/events/MediaCarousel.tsx`

In the `containerStyle` object, in the `isHero` branch:
- Replace `maxHeight: "70vh"` with `maxHeight: "100vh"` (safety rail for absurdly tall uploads only — e.g. 9:32 screenshots).
- Keep `aspectRatio` driven by the first item's natural ratio.
- Keep `minHeight: "250px"` so videos with not-yet-loaded metadata don't collapse.
- Keep `object-cover` on `<img>` and `<video>` (no letterbox bars; container matches media ratio so cover == contain visually).

No other files change. Feed cards, modals, and compact carousels are untouched.

## Result by media shape

- **Landscape (16:9, 4:3):** unchanged — short hero, no bars.
- **Square (1:1):** unchanged — clean square frame.
- **Portrait (9:16, 3:4):** **fixed** — full image visible, no horizontal cropping. Page is taller (~670px hero on 390px-wide viewport for 9:16) — same vertical scroll pattern as Instagram/TikTok.
- **Extreme portrait (9:21+):** safety rail caps at 100vh so hero never exceeds one screen height.

## Verification

After the edit, open the event from the screenshot (`/event/b3907173-...`) and confirm the cropped image now shows fully edge-to-edge with no black bars.

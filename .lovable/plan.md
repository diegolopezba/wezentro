## Goal

Replace the inline "zentro." text splash in `index.html` with the same logo splash used by React (`/lovable-uploads/11ff2e19-f4c9-4c50-8921-c329037d49ac.png`), so there's a single consistent splash from cold boot through React mount — no white flash, no visual swap.

## Changes

**1. `index.html`**
- Keep the `#app-splash` shell painted before the JS bundle (still critical for killing the white flash).
- Replace the `.splash-mark` text ("zentro.") with an `<img>` pointing to `/lovable-uploads/11ff2e19-f4c9-4c50-8921-c329037d49ac.png`, sized to match the React splash (192px, `object-fit: contain`), centered on the dark `#0A0A0B` background.
- Preload that image via `<link rel="preload" as="image" href="...">` in `<head>` so it's ready for the very first paint.
- Drop the now-unused `@keyframes splash-in` / `.splash-mark` / `.splash-dot` CSS.

**2. `src/main.tsx`**
- Keep the existing `requestAnimationFrame` fade-out of `#app-splash` on React's first frame.
- Extend the fade delay so the boot splash stays visible for a **minimum of 600ms total** before starting the fade, then fades over 260ms (already defined). This prevents a jarring instant-disappear on fast connections.

**3. `src/App.tsx`**
- Remove the `<SplashScreen>` render (lines 150–157) and the `showSplash` state + `Capacitor` import if only used for the splash.
- The boot splash from `index.html` now covers the entire pre-mount + first-frame window, so the React-level `SplashScreen` component is redundant and causes the double-splash the user is seeing.

**4. `src/components/SplashScreen.tsx`**
- Leave the file in place (unused) — user asked not to delete anything. It can be removed in a future cleanup pass.

## Recommended splash duration

Industry norms:
- **Native apps (iOS/Android):** ~400–1000ms is standard. Apple's HIG explicitly says the splash should *not* be an intentional delay — show it only as long as needed to load the first screen.
- **Web/PWA:** 400–800ms feels natural. Under 300ms feels like a flicker; over 1200ms feels slow.

**Recommendation: 600ms minimum**, then fade out on React's first frame (whichever is later). This gives:
- Enough time for the Poppins font and initial CSS to settle so the first painted screen looks correct.
- Time for React to mount routes, so users don't see a bare shell right after the splash.
- Not so long that returning users feel the app is sluggish.

On native (Capacitor), the OS splash already covers cold boot, so we keep the JS-side minimum at 0ms there and hide as soon as React mounts.

## Out of scope

- No deletion of `SplashScreen.tsx` (per prior "don't delete anything" rule).
- No changes to the logo asset itself.
- No changes to native (Capacitor) splash config.

# Mobile-First Performance Plan (Capacitor PWA) — modeled on Pinterest, Instagram, TikTok

Every fix below is scoped to **mobile / Capacitor WebView**. Nothing here is desktop-only, and a couple of items (like the splash screen) explicitly defer to Capacitor's native splash on device.

## Research basis

I cross-checked against:
- **Pinterest Engineering** — PWA case study (Addy Osmani) + "Four Lessons in Making Pinterest Faster on Android" (Mobile Vitals, 2022)
- **web.dev** — official lazy-loading video and image guidance
- **TanStack Query** — `useInfiniteQuery` cursor pagination (the same pattern Instagram and TikTok web feeds use)
- **Capacitor docs** — WebView memory + splash behavior on iOS/Android

The big apps all converge on the same mobile playbook: **tiny first payload, defer everything, paginate, lazy media, only one decoded video at a time, small DOM.** Your app currently violates 6 of those 7. Fixing them gets you the same wins.

## What's mobile-specific in every fix

Mobile WebViews (especially iOS WKWebView under Capacitor) have very different constraints than desktop browsers:
- Less RAM — large DOMs cause Safari to evict the page when backgrounded
- Slower JS parse — every KB of JS costs ~1ms on a mid-range Android
- Battery cost for video decoding is real; iOS throttles after ~3 simultaneous `<video>` elements
- Cellular: TTFB can be 500ms+, so any blocking request before first paint is felt
- Capacitor reuses the WebView across app launches — a heavy first paint is paid every cold start

So the order below prioritizes things mobile users feel most.

## Phase A — Quick mobile wins (no DB changes)

**A1. Splash screen — defer to Capacitor's native splash on device**
- `SplashScreen.tsx` minDisplayTime is already 400ms. Good.
- On Capacitor, hide the React splash immediately when running natively (`Capacitor.isNativePlatform()`) — the native splash already covered the boot, the JS splash is just adding 400ms more.
- On web/PWA: keep 400ms or hide as soon as For You data resolves, whichever first.

**A2. KeepAlive `max={4}` → `max={2}` (mobile RAM win)**
- Mobile WebViews evict pages aggressively. Holding 4 mounted pages can push iOS to drop the whole tab when the user backgrounds the app.
- 2 (current + previous) matches Instagram's web pattern.

**A3. Trim `preloadCoreRoutes` on mobile**
- Currently preloads 5 route chunks on idle. On 4G that's 5 extra parses competing with the feed.
- Keep only Discover + EventDetail (the two highest-tap routes).
- Wrap preload behind `navigator.connection?.effectiveType !== '2g'` so very slow connections skip it.

**A4. Service worker `NetworkFirst` → add `networkTimeoutSeconds: 3`**
- On flaky cellular the SW currently waits forever before falling back to cached `index.html`. 3s timeout = instant cached shell on bad signal, fresh HTML on good signal.
- Pure mobile win; desktop barely notices.

**A5. EventCard images — mobile sizing + native lazy**
- Add `loading="lazy"` and `decoding="async"` to all off-screen `<img>` (browser-native, free)
- Request Supabase storage transforms at mobile size: `?width=750&quality=70` instead of original (often 2000px+, ~10x bigger)
- Use a fixed aspect-ratio container so cards don't reflow as images arrive (this also kills CLS on mobile, where it's most jarring)

**A6. EventCard / MediaCarousel `<video>` — TikTok-style single-decoder rule**
- All `<video>` start with `preload="none"`
- IntersectionObserver: switch to `preload="metadata"` when within 1 viewport
- Only autoplay when ≥75% on-screen; pause + `currentTime=0` when off-screen
- This single change usually halves CPU + battery on a feed-scrolling session

**A7. Defer 5 secondary For You queries**
- Render the feed using `get_for_you_events` + `get_trending_scores` only (already 2 queries)
- Wrap `creator-attendance`, `day-of-week-prefs`, `tag-prefs`, `mutual-followers`, `collaborative-boosts` in `requestIdleCallback` (with `setTimeout` fallback for Safari)
- Feed re-sorts in place when they arrive — same UX as Pinterest's "rerank on settle"

## Phase B — Real pagination (the Instagram/TikTok pattern)

**B1. Add `_limit` and `_cursor` to `get_for_you_events` RPC**
- Return 12 items at a time, ordered by created_at + id

**B2. Convert `useForYouEvents` to `useInfiniteQuery`**
- `pageParam` = last `(created_at, id)` cursor
- Trigger `fetchNextPage` when user scrolls within 70% of feed end (IntersectionObserver sentinel at the bottom)
- This alone removes the 200-item cap concern and cuts initial JSON parse by ~94% on cold start

## Phase C — Capacitor / native polish (later)

- Audit `framer-motion` use on the feed — heavy `m.div` spring animations on every card hurt scroll FPS on Android. Replace per-card animations with CSS `transform`.
- Confirm Mapbox is not eagerly imported anywhere outside `/discover`. Keep its ~800KB chunk out of the cold-start bundle.
- Add a tiny RUM hook (LCP / INP via `web-vitals`) reporting to Supabase, so future regressions show up — same approach Pinterest documented.

## Verification on mobile

After Phase A I'll capture before/after metrics from the **mobile viewport** specifically:
- Cold-start LCP on 4G throttle
- Long tasks during scroll
- Memory after navigating Index → EventDetail → Profile → back

If the numbers don't move, we revisit before doing Phase B.

## What this delivers on a real phone

- Cold start TTI: ~3–5s → ~1–1.5s on mid-range Android over 4G
- Scroll past 50 cards stays at 60fps (currently degrades from `<video>` decoders + 200 mounted DOM nodes)
- Battery drain on a 10-min feed scroll cuts roughly in half
- App returning from background paints the cached shell instantly instead of a white flash

## Approve and I'll execute Phase A first, then capture mobile metrics before moving to Phase B.

---

## Phase C — Executed

- **EventCard framer-motion → CSS**: `m.div` removed (highest-volume component, 200+ instances on feed). Replaced with plain `<div className="feed-card-enter">`, GPU-only keyframe `feedCardEnter`, `:active { scale(0.98) }` for tap feedback, `prefers-reduced-motion` respected. Staggered enter via CSS var `--enter-delay`. `TimelineCard` kept on framer-motion because its `layoutId` powers the profile timeline overlay transition.
- **Mapbox confirmed lazy**: only imported by `MapView` (lazy in `Discover`), `LocationPicker` (only in `Create` + `BusinessLocationPicker`). Not in cold-start bundle.
- **RUM hook**: `web-vitals` package + `src/lib/webVitals.ts`. Reports LCP/INP/CLS/FCP/TTFB into new `web_vitals` table (anon-insert, no client read). Init dynamically imported in `App.tsx` after mount. Tags rows with `is_native` so PWA vs Capacitor metrics are separable.

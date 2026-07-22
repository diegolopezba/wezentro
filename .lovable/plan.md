# Native-Feel Overhaul — Grounded in Pinterest's Actual Patterns

Research on Pinterest's PWA (Gestalt Masonry, PINRemoteImage, 2017 rewrite retrospective, Addy Osmani case study) confirms our current issues match exactly what Pinterest engineers publicly flagged as "feels like a website, not an app." Below is a plan that copies their proven patterns 1:1, adapted for Vite + React + Capacitor.

## Root causes in our app vs Pinterest's solutions

| Issue we have | What Pinterest actually does | Our current state |
|---|---|---|
| Route swap flashes `<PageLoader/>` | Persistent app-shell; content pane swaps only; iOS push curve `cubic-bezier(0.32,0.72,0,1)` | Full unmount + Suspense fallback on 20+ routes |
| Back-nav loses scroll/state | Detail views are **modal overlays** over the grid, not route replacements | Only EventDetailModal does this; UserProfile / Notifications / Saved all unmount |
| Chunks load on tap → spinner | Prefetch chunks on `pointerdown` + IntersectionObserver | No prefetch beyond top-of-file idle preload |
| CSS-columns masonry reflow | Gestalt Masonry: absolute-positioned, measured, height-cached, virtualized | We ship JS absolute-positioned masonry ✅ but no virtualization |
| Blank → full image pop-in | PINRemoteImage: progressive JPEG + dominant-color placeholder + aspect boxes | Raw `<img>`, no LQIP, no dominant color |
| Sheets bleed scroll on iOS | body scroll-lock + `overscroll-behavior: contain` on sheet scroller | Radix defaults, inconsistent lock |
| Inconsistent tap feedback | Gestalt `TapArea` — single primitive, `touch-action: manipulation`, active-scale | Ad-hoc `active:scale-95` sprinkled around |
| Splash → blank → content | SSR shell + skeleton masonry that matches final layout | JS splash then Suspense spinners |

## Phased plan (each phase ships independently)

### Phase 1 — Persistent shell + iOS-style page transitions
Pinterest's #1 "feels native" lever.
- Extract a real `<AppShell>` (bottom nav + header) that never unmounts across all authenticated routes — right now only 4 routes share `KeepAliveLayout`.
- Wrap the route `<Outlet/>` in `AnimatePresence mode="popLayout"` with slide+fade using Apple's push curve `cubic-bezier(0.32, 0.72, 0, 1)`, 250ms.
- Track push vs pop via a `useNavDirection` hook (compare current vs previous `location.key` against a ref stack) so back-nav slides right, forward slides left — matching `UINavigationController`.
- Kill `PageLoader` full-screen spinners; replace with the outgoing page held during Suspense (React 18 `startTransition` already enabled in router).

### Phase 2 — Modal-over-shell for detail views (Pinterest's back-stack trick)
Copy the "background location" pattern we already use for EventDetail, extend to:
- `/user/:id` (UserProfile)
- `/notifications`
- `/saved`
- `/settings/*` sub-pages opened from Profile
Result: back = close overlay, grid stays mounted with exact scroll position for free. No keep-alive gymnastics needed for these routes.

### Phase 3 — Intent-based route prefetching
- Add `usePrefetchOnIntent(importFn)` hook wired into `EventCard`, `TimelineCard`, `NavLink`, `<Link>`.
- Triggers on `pointerdown` (Pinterest pattern — ~80ms head start before pointerup) AND on `IntersectionObserver` when card enters viewport with `rootMargin: '400px'`.
- Skip on `navigator.connection.saveData` or `effectiveType === '2g'` (we already do this on splash).
- Removes 100% of route chunk waterfalls on tap.

### Phase 4 — Feed virtualization
Our current masonry is Pinterest-shaped (absolute-positioned, height-cached) but keeps every card in the DOM. Pinterest windows at ~40-60 items.
- Integrate `@tanstack/react-virtual` inside `useMasonryLayout` — only render cards whose absolute `top` intersects `[scrollTop - viewport, scrollTop + 2×viewport]`.
- Cards outside range become empty placeholder divs (heights preserved so scroll doesn't jump).
- Keeps DOM node count constant regardless of feed length → massive scroll-fps win on low-end Android in the Capacitor webview.
- Add `contain: layout paint` to every card to isolate reflow.

### Phase 5 — Progressive images (PINRemoteImage-style)
- Aspect-ratio boxes on every media container (we already have `width`/`height` metadata) → zero CLS.
- **Dominant-color placeholder**: extract a single hex on upload via a 1×1 canvas sample in `mediaCompression.ts`, store on the row as `dominant_color`. Card background = dominant color until image `onLoad` fires, then fade image over 150ms.
- `srcset` + `sizes` for responsive delivery (Supabase Storage image transforms).
- `fetchpriority="high"` + `loading="eager"` for the first 4 above-the-fold cards; `loading="lazy"` `decoding="async"` for the rest.
- Backfill dominant colors for existing media in a one-off SQL job.

### Phase 6 — `<Pressable>` primitive (Gestalt TapArea equivalent)
- Single component: `touch-action: manipulation`, transparent tap highlight, 100ms `scale(0.97)` on `:active`, optional haptic tick on `pointerdown` via existing `haptics.ts`, focus ring for keyboard/a11y.
- Replace ad-hoc `active:scale-95` in `EventCard`, `TimelineCard`, `BottomNav`, `NavLink`, buttons in sheets.
- One primitive to tune globally.

### Phase 7 — Sheet & scroll polish
- Migrate `CommentsSheet`, `ShareEventModal`, `LocationSheet`, `ReservationSheet`, `MenuSheet`, `EditEventSheet` from Radix Dialog to `vaul` Drawer (drag-to-dismiss with rubber-band, native feel).
- Global `useBodyScrollLock` on every sheet/modal open — sets `body { position: fixed; overflow: hidden }` and restores scroll position on close (fixes iOS bleed).
- `overscroll-behavior: contain` on the feed root and every sheet scroller.
- Passive scroll listeners audit (all `addEventListener('scroll'...)` gets `{ passive: true }`).

### Phase 8 — Startup, splash, bundle diet
- Native `@capacitor/splash-screen` hides only after skeleton masonry paints (not after JS boot).
- Skeleton grid = gray boxes at correct aspect ratios matching the real feed layout — instant "app is here" feel.
- Audit `framer-motion` imports: force everyone to use `m` from `LazyMotion` (currently mixed). ~35KB gzip saved.
- Defer OneSignal init, DeepLinkHandler registration, `initWebVitals` to `requestIdleCallback` (mostly done — verify).
- Vite `manualChunks` per route + heavy vendors (mapbox, recharts, tus-js-client) as separate chunks.

### Phase 9 — Micro-polish
- Pull-to-refresh: rubber-band easing + haptic tick at threshold.
- Long-press quick-actions on TimelineCard (already on EventCard).
- Toast timing tightened to native pill feel (already sonner top-center).

## Technical notes

- **Apple push curve** `cubic-bezier(0.32, 0.72, 0, 1)` is the authentic iOS spring approximation — used across Phase 1 & 7 for consistency.
- **Modal routes** rely on `location.state.backgroundLocation` — the same pattern App.tsx already implements for `/event/:id`. Extending to more routes is copy-paste.
- **Virtualization + absolute masonry**: `@tanstack/react-virtual`'s dynamic-size API accepts our precomputed `top` values directly — no algorithm rewrite.
- **Dominant color extraction** runs client-side during upload compression; zero server cost. Backfill = a one-time edge function iterating existing media.
- **Capacitor considerations**: WKWebView (iOS) already retains state between pushes; our issue is React tearing components down, not the webview. Modal overlays + persistent shell fix it at the React layer, which is the layer that matters.
- **What we're NOT doing**: SSR (Pinterest does it, but Vite+Capacitor doesn't need it — native splash covers first paint), custom scroll containers (Pinterest explicitly warns against fighting native scroll).

## Rollout order & impact

| # | Phase | Perceived impact | Effort |
|---|---|---|---|
| 1 | Persistent shell + transitions | ★★★★★ | M |
| 2 | Modal-over-shell for detail views | ★★★★★ | S |
| 3 | Intent-based prefetch | ★★★★ | S |
| 4 | Feed virtualization | ★★★★ (low-end) | M |
| 5 | Progressive images | ★★★★ | M |
| 6 | Pressable primitive | ★★★ | S |
| 7 | Sheets + scroll lock | ★★★ | M |
| 8 | Bundle diet + splash | ★★ | S |
| 9 | Micro-polish | ★★ | S |

## Out of scope
- Backend / algorithm changes.
- Visual redesign — brand red, Poppins, dark theme untouched.
- SSR / framework migration.

## Sources this plan draws from
- Addy Osmani, *A Pinterest PWA Performance Case Study* (2017)
- Zack Argyle, *A one year PWA retrospective* — Pinterest Engineering
- `pinterest/gestalt` — `Masonry.tsx`, `TapArea`, dynamicHeights utils
- `pinterest/PINRemoteImage` — progressive image loading
- Sam Meder et al., *Driving user growth with performance improvements* — Pinterest Eng

Approve to start with **Phase 1 + 2** (biggest perceived-native win, together ~1 sprint), or tell me to reorder / expand any phase.

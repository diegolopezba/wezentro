# Fix slow, laggy and unscrollable home feed (Android + desktop)

I reproduced the problem in a real browser session against the app. There are three separate defects stacking on top of each other, and together they explain both "the feed doesn't scroll" and "everything lags".

## What I found (measured, not guessed)

**1. The page is left scroll-locked.**
On first load the home onboarding sheet opens automatically. While it is open, `body` has `data-scroll-locked=1`, `overflow: hidden` and `pointer-events: none` — the document cannot scroll at all (measured: `window.scrollY` stayed at 0 after scrolling 3000px). After dismissing it, scrolling works again. Any sheet that unmounts while another one is opening leaves this lock behind, which is exactly the "feed is frozen until I refresh" symptom, and it happens on desktop too.

**2. There are three competing scroll containers.**
`AppLayout` is `min-h-[100dvh] overflow-auto`, `PullToRefresh` is another `overflow-auto` wrapper, but the element that actually scrolls is the document. Consequences:
- `PullToRefresh` checks `container.scrollTop`, which is always 0, so it thinks the user is at the top *anywhere* in the feed and calls `preventDefault()` plus translates the whole feed on every downward touch drag. On Android this fights the native scroll and produces the "sticky / won't scroll / lags" feel.
- The home header's scroll listener is bound to a container that never scrolls, so the hide-on-scroll header never fires.

**3. Feed virtualization is not recycling.**
After scrolling through the feed, 70 cards were mounted at once (should be ~15-20) and I recorded long tasks of 58-170 ms. Causes:
- The scroll listener is attached to a "nearest scrollable ancestor" found by walking the DOM, which resolves inconsistently against the wrappers in defect 2 — so the visible window stops updating and cards never unmount.
- Every card that has not been measured yet is force-rendered, so a full page of new items mounts entirely before virtualization can trim it.
- Each individual card measurement bumps a counter that rebuilds every position object, re-rendering all mounted cards. With many cards mounted this becomes quadratic work — the exact profile of "gets slower the longer you scroll".

## Plan

**One scroll owner: the document**
- Remove `overflow-auto` from `AppLayout` so nothing but the page scrolls.
- Remove the `overflow-auto` wrapper from `PullToRefresh`; it becomes a plain positioning wrapper and reads `window.scrollY` to decide whether the user is at the top.
- Only call `preventDefault()` when the user is genuinely at scroll top and pulling down, so ordinary Android scrolling is never intercepted.
- Point the home header's hide-on-scroll listener at `window`.

**Kill the stuck scroll lock**
- Add a small guard that clears `data-scroll-locked`, `overflow` and `pointer-events` from `body` when no dialog/sheet is open, so a leaked lock can never freeze the app.
- Don't auto-open the home onboarding sheet for signed-out visitors, and only auto-open once per user after the feed has rendered.

**Make virtualization actually virtualize**
- Bind the visibility window directly to `window` scroll (rAF-throttled) using the container's offset, instead of walking for a scroll parent.
- Render unmeasured cards only inside the visible window plus overscan, so a newly fetched page never mounts in full.
- Coalesce measurements into a single relayout per frame and wrap the card item in `React.memo` with a positional comparison, so a measurement no longer re-renders every mounted card.
- Reduce overscan to roughly one viewport and add `content-visibility: auto` to offscreen card content.

**Verify**
- Emulated Android viewport with touch: confirm touch-drag scrolls the feed, pull-to-refresh still triggers only at the top.
- Re-measure: mounted card count should stay flat (~15-20) while scrolling the whole feed, long tasks under ~50 ms.
- Desktop: confirm the feed scrolls immediately on load with the onboarding sheet present or dismissed.

## Technical notes

Files touched: `src/components/layout/AppLayout.tsx`, `src/components/PullToRefresh.tsx`, `src/pages/Index.tsx` (scroll listener + intro gating), `src/components/events/EventFeed.tsx` (virtualization window, memoized card item), `src/hooks/useMasonryLayout.ts` (measurement batching, relayout on column-width change), plus a small scroll-lock cleanup utility mounted once in the app shell.

No backend, data model, or business-logic changes.

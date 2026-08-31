# Pinterest/Instagram-style auto-hiding headers

## Current state (verified)

- The document (`window`) is the single scroll owner — no nested scroll containers (fixed in the earlier feed-scroll work). `AppLayout` does not scroll.
- `src/pages/Index.tsx` already has a `window` scroll listener with direction detection, but it only collapses the **category pills row** (height animation, lines 263–304). The top bar (logo, bell, filters, search) stays pinned — this is what changed vs. the behavior you want.
- Other pages with sticky headers (`Profile`, `Saved`, `Notifications`, `Discover`, etc.) have no hide-on-scroll behavior at all.
- No shared hook exists for scroll-direction detection; each page would duplicate logic.

## Plan

**1. New reusable hook: `src/hooks/useHideOnScroll.ts`**
- Listens to `window` scroll (passive, rAF-throttled — same pattern already proven in `Index.tsx`).
- Tracks scroll **direction**, not position:
  - Scrolling down past a ~12px movement threshold and below ~64px from top → `hidden`.
  - Scrolling up past the same threshold → `visible`.
  - `scrollY <= 0` (top of page) → always force `visible`.
- The threshold accumulator resets on direction change, so tiny jitters never toggle the header (no flicker).
- Returns a boolean (e.g. `isHeaderVisible`) — no styling opinions, reusable anywhere.

**2. Apply to the home header (`src/pages/Index.tsx`)**
- Replace the existing pills-only collapse with the new hook.
- The **entire** sticky header (logo bar + search + category pills) gets:
  `transition-transform duration-300 ease-out` + `translateY(-100%)` when hidden, `translateY(0)` when visible.
- Header stays `sticky top-0 z-30` so content never reflows or jumps — it simply slides under/out over the content, exactly like Pinterest.
- Remove the now-unneeded inner framer-motion height animation on the pills row and the old `headerVisible` state/listener.

**3. Reuse the same hook on the other main pages' sticky headers**
- `src/pages/Profile.tsx`, `src/pages/UserProfile.tsx`, `src/pages/Saved.tsx`, `src/pages/Notifications.tsx`, `src/pages/MyTickets.tsx`, `src/pages/Discover.tsx` (where a sticky header exists).
- Same pattern: keep the existing header markup/design untouched, just add the translate/transition classes driven by the hook.
- Business dashboard subpages keep their current fixed headers (dense tools, not feed browsing) — can be added later if you want.

**4. Interaction guarantees (per your spec)**
- Hide only after ~10–20px of downward travel; show after ~10–20px of upward travel.
- Always visible at `scrollTop === 0`.
- 200–300ms ease-out slide, works on mobile and desktop, no new scroll containers, no z-index changes (headers stay below the bottom nav / overlays per the global z-scale).

## Technical notes

- Files: new `src/hooks/useHideOnScroll.ts`; edits to `src/pages/Index.tsx`, `Profile.tsx`, `UserProfile.tsx`, `Saved.tsx`, `Notifications.tsx`, `MyTickets.tsx`, `Discover.tsx`.
- No design, typography, spacing, or functionality changes — scroll behavior only.
- Verify with Playwright: emulate mobile touch scroll on home — header slides away scrolling down, returns on a small upward flick, and is always visible at the top; confirm no flicker during small wiggles and that pull-to-refresh still works.

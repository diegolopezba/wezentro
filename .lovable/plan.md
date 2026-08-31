# Make the home header fully hide on scroll

## Current state (verified)

- The document (`window`) is the single scroll owner — no nested scroll containers.
- `src/pages/Index.tsx` already has a `window` scroll listener with direction detection and a `headerVisible` state (lines 50–53, 154–173).
- That state is currently used only to collapse the **category pills row** (lines 263–304) via a framer-motion height animation. The top bar (logo, bell, filters, search) stays pinned.

## Plan

**1. Reuse the existing scroll listener in `src/pages/Index.tsx`**
- Keep the current `window` scroll + direction detection logic unchanged.
- `headerVisible` will now control the **entire sticky header**, not just the pills row.

**2. Animate the whole header**
- Wrap the existing `<header>` in a container that stays `sticky top-0 z-30` and receives:
  - `transition-transform duration-300 ease-out`
  - `translateY(-100%)` when `!headerVisible`
  - `translateY(0)` when `headerVisible`
- This gives the Pinterest/Instagram slide-up/slide-down behavior without changing the header's design, typography, icons, colors, spacing, or functionality.

**3. Remove the pills-only collapse**
- Remove the inner framer-motion `m.div` height/opacity animation around the category pills row.
- The pills row simply rides along with the rest of the header as it slides off/on.

**4. Interaction guarantees**
- Hide only after the existing downward movement threshold, show after the upward threshold.
- Always visible at `scrollTop === 0` (already enforced by `currentScrollY <= 50`).
- Works with the existing document scroll container — no new scroll container.

## Files touched

- `src/pages/Index.tsx` only.

## Verify

- Playwright mobile emulation: scroll down → whole header slides up and hides; small upward scroll → header slides back down; at top of page header is fully visible; no flicker from tiny scroll wiggles; pull-to-refresh still triggers at the top.

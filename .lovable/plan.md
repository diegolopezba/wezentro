

# Plan: Instagram/Pinterest-Style Animation Strategy

Replace reflexive `framer-motion` usage with the same pattern Instagram and Pinterest use on web: **CSS-first, framer-motion only for gestures**.

## Approach

**Tier 1 — CSS-only (no framer-motion):**
Files using only simple fades, slides, or staggered list entries. Replace `<motion.div initial={{opacity:0}} animate={{opacity:1}}>` with `<div className="animate-fade-in">`. Staggered lists use `style={{ animationDelay: \`${i * 30}ms\` }}`.

Target ~29 files including: notification items, dashboard cards (`StatsCard`, `EventsPerformanceTable`, `PromocionesSection`), profile sections, comment items, search results, settings rows, splash screen, onboarding steps.

**Tier 2 — LazyMotion + `m`:**
Files that genuinely need framer-motion (gestures, layout animations, AnimatePresence with exit animations, drag). Wrap `App.tsx` in `<LazyMotion features={domAnimation} strict>` and replace every `motion.X` → `m.X` import. This swaps the 50 KB `motion` for the 6 KB `m` proxy — features only load on-demand.

Target ~30 files including: `EventCard` (long-press scale), `EventDetailOverlay` (AnimatePresence exit), `PullToRefresh` (drag), `Index.tsx` header (animated height), tab pill indicators, sheet drawers.

**Tier 3 — Untouched:**
`PullToRefresh`, `useSwipeBack`, gesture-driven sheets — leave as full `framer-motion` since they need physics/drag.

## Bundle impact

- Current: ~50 KB framer-motion across all routes
- After: ~6 KB `m` proxy + on-demand `domAnimation` chunk (~12 KB) loaded once
- Net savings: ~30 KB initial gzipped, faster TTI on first load

## Execution

1. Add `<LazyMotion features={domAnimation} strict>` wrapper in `App.tsx`
2. Tier 1 conversion: 29 files → CSS classes (mechanical search/replace per file)
3. Tier 2 conversion: 30 files → `motion` → `m` import swap (mechanical)
4. Verify nothing visually regresses on: feed scroll, event detail open/close, tab switch, sheet open, pull-to-refresh

## Files touched

~60 component files. No new files. No config changes beyond the `App.tsx` wrapper. No dependency changes — `framer-motion` stays installed (still used in Tier 2 + Tier 3).

## Risks

- `strict` mode on `LazyMotion` will throw at runtime if any `motion.X` was missed during the rename — that's the point, it surfaces misses immediately rather than silently double-loading the bundle.
- AnimatePresence `exit` animations work identically with `m`.

## Out of scope

- Replacing `framer-motion` entirely (Tier 3 keeps it)
- Touching `PullToRefresh`, `useSwipeBack`, drag gestures
- New animations or visual changes


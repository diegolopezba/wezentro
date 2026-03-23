
## Native App Readiness — Verified Plan

### What was confirmed correct vs. what changed from the previous plan

**Confirmed real problems (verified via code + web sources):**
- `hover:` sticky states on iOS/Android WebView — confirmed real by WebKit bug #158517, CSS-Tricks, and a Jan 2026 StackOverflow thread. Every `hover:` in the app can trigger a stuck highlight after a tap.
- `whileHover` on EventCard and TimelineCard — registers a Framer Motion gesture listener per card that does nothing on touch.
- `layoutId="activeTab"` still present in Index.tsx lines 268 and 273.
- Animation stagger `index * 0.05` with no clamp — EventCard line 168, causes multi-second delays for late-feed cards.

**What the previous plan got wrong — corrected:**
- `@capacitor/network` was NOT recommended. A Dec 2025 StackOverflow question and Jan 2026 Ionic forum thread both confirm it fails to detect returning-online on iOS, and the GitHub issue is closed `not_planned` as of Feb 2026. The current `window.online/offline` listeners are more reliable. This fix is dropped entirely.

---

### Fix 1 — Enable `hoverOnlyWhenSupported` in Tailwind (HIGHEST IMPACT, 1 line)

Rather than hunting `hover:` class by class across every file, Tailwind has a built-in config flag: `future: { hoverOnlyWhenSupported: true }`. This wraps every `hover:` variant app-wide in `@media (hover: hover)`, which means touch-primary devices (phones, tablets, Capacitor WebView) **never** receive hover styles. One line in `tailwind.config.ts` fixes every file at once — EventCard, EventDetailOverlay, TimelineCard, Index, all UI components, all sheets.

This is the canonical solution documented on CSS-Tricks, Benjamin Crozat's blog, and the Tailwind v3 docs.

**File:** `tailwind.config.ts`
Add inside the root config object:
```ts
future: {
  hoverOnlyWhenSupported: true,
},
```

### Fix 2 — Remove `whileHover` from EventCard and TimelineCard

`whileHover={{ scale: 1.02 }}` on both cards registers a Framer Motion pointer-enter listener that is never triggered on touch screens but still consumes memory per card instance (up to 200 in the feed). Remove it. `whileTap={{ scale: 0.98 }}` is kept — it fires correctly on touch.

**Files:** `src/components/events/EventCard.tsx` line 171, `src/components/events/TimelineCard.tsx` line 120.

### Fix 3 — Clamp animation stagger in EventCard

`delay: index * 0.05` at 200 cards = card #199 has a 9.95-second entrance delay. Cards that scroll into view mid-session appear invisibly delayed. Clamp to `Math.min(index, 6) * 0.05` — first 6 cards stagger (the visible ones on load), the rest appear instantly.

**File:** `src/components/events/EventCard.tsx` line 168.

### Fix 4 — Replace `layoutId="activeTab"` with a simple animated indicator

`layoutId="activeTab"` on the tab pill in Index.tsx registers a layout measurement tracker. Since the tab bar re-renders on every scroll event (via `headerVisible` state), this fires repeatedly. Replace with a `motion.div` that uses `initial={false}` + `animate={{ opacity: 1 }}` — visually identical sliding pill but without layout tracking.

**File:** `src/pages/Index.tsx` lines 267–275.

---

### Files changed

| File | Change |
|---|---|
| `tailwind.config.ts` | Add `future: { hoverOnlyWhenSupported: true }` |
| `src/components/events/EventCard.tsx` | Remove `whileHover`; clamp stagger delay |
| `src/components/events/TimelineCard.tsx` | Remove `whileHover` |
| `src/pages/Index.tsx` | Replace `layoutId="activeTab"` with simple animate |

No new dependencies. No `@capacitor/network` (confirmed buggy on iOS). 4 surgical changes, all verified against live code.


# Plan: Native-Feel Polish & Performance (Items 15–35) — Revised

Changes from previous plan: delete `hover:` entirely (no `md:hover:` wrap), skip item 19 (header stays in `Index.tsx`).

---

## Phase A — Performance core (items 15, 16, 20, 22, 23, 24)

**15. Delete all `hover:` classes**
- Strip every `hover:*` Tailwind utility across the codebase (~133 occurrences). No replacement, no `active:` swap unless the interaction genuinely needs visual feedback that's currently missing. Most buttons already have `active:scale-95` from project conventions.

**16. Virtualize the masonry feed**
- Wire `@tanstack/react-virtual`'s `useWindowVirtualizer` into `EventFeed.tsx`. Render only visible rows + 5 overscan. Falls back to full render if the list is <30 items.

**20. `React.memo` for `EventCard`**
- Custom comparator on `id`, `attendees`, `isSponsored`, `dismissed`. Prevents 200-card re-render storm on parent updates.

**22. Image CDN transforms**
- New `src/lib/imageOptimization.ts` with `getOptimizedImageUrl(url, width, quality?)`:
  - If URL is from Supabase storage → append `?width=...&quality=70&resize=cover`
  - Otherwise → return unchanged
- Apply at: `EventCard` (480px), `Avatar` everywhere (80–160px), `MessageBubble` thumbnails (320px), notification items (40px), dashboard charts (40px).

**23. Per-query `staleTime`**
- Override to `0` for `useChats`, `useNotifications`, `useEventComments`, `useGuestlist`. Keep 5 min default for events/profile/feed.

**24. New `get_for_you_events` RPC**
- Returns event row + top-5 guestlist avatars (just `avatar_url`) joined server-side instead of full nested profile rows.
- Reduces typical 200-event payload from ~2 MB to ~150 KB.
- `useForYouEvents.ts` switches to `supabase.rpc('get_for_you_events', { _user_id, _lat, _lng })`.

---

## Phase B — Image & DOM hygiene (items 17, 18, 33, 34)

**17. `loading="lazy" decoding="async"`**
- Add to all 23 unflagged `<img>` tags. First 4 above-the-fold home cards get `fetchpriority="high"`.

**18. Faster splash**
- `minDisplayTime` 1200 → 400 ms. Hide as soon as the initial `useForYouEvents` query resolves rather than waiting on a fixed timer.

**33. `min-h-screen` → `min-h-[100dvh]`**
- Sweep all 27 occurrences. Fixes iOS Safari URL-bar viewport jump.

**34. Skeleton for `EventDetailOverlay`**
- New `EventDetailSkeleton` (hero blur + title bars) shown while data loads. Removes pop-in.

---

## Phase C — Native UX (items 28, 29, 30, 31, 32, 35)

**28. Haptics on missing flows**
- `triggerHaptic('light')` on: sponsored card tap, follow toggle, comment send, pull-to-refresh complete, sheet open/close.

**29. Safe-area on overlays**
- Close button on `EventDetailOverlay` + `ChatDetail` header gets `top-[env(safe-area-inset-top)] mt-2`.

**30. Keyboard handling on chat**
- Apply `useKeyboardAdjust` to `ChatDetail.tsx`. Compose bar lifts via `transform: translateY(-keyboardHeight)`.

**31. Dynamic status bar**
- Configure `@capacitor/status-bar` once at boot in `main.tsx` to `Style.Dark` overlay-true. Remove ad-hoc calls elsewhere.

**32. High-res splash assets**
- Replace splash PNG with 1024×1024 maskable icon + 2732×2732 splash for store reviewer compliance. Update `capacitor.config.ts`.

**35. Global swipe-back**
- Mount `useSwipeBack()` once inside `KeepAliveLayout` so every page gets iOS-style edge-swipe → `navigate(-1)`.

---

## Phase D — Code-weight (item 21 — light touch)

**21. Framer-motion trim**
- Replace ~12 trivial `<motion.div animate={{opacity:1}}>` fade-ins with `.animate-fade-in` CSS class.
- Consolidate duplicate `AnimatePresence` instances in `Index.tsx`, `Discover.tsx`, `Profile.tsx`.
- Saves ~30 KB gzipped, no behavior change. No full migration.

---

## Files touched

**Phase A:** `EventFeed.tsx`, `EventCard.tsx`, new `src/lib/imageOptimization.ts`, `useForYouEvents.ts`, `useChats.ts`, `useNotifications.ts`, `useEventComments.ts`, `useGuestlist.ts`, ~20 files containing avatar/img usage, new migration with `get_for_you_events` RPC.

**Phase B:** ~23 component files (img attrs), `SplashScreen.tsx`, `App.tsx`, sweep `min-h-screen`, new `src/components/skeletons/EventDetailSkeleton.tsx`.

**Phase C:** `EventCard.tsx`, `EventDetailOverlay.tsx`, `ChatDetail.tsx`, `main.tsx`, `capacitor.config.ts`, new splash assets, `KeepAliveLayout.tsx`.

**Phase D:** ~15 component files with trivial motion replacements.

**Hover sweep:** ~50 files containing `hover:` utilities.

---

## Out of scope
- Items 1–14 (security + correctness bugs) per earlier decision
- Item 19 (header lift) per this revision
- Test coverage, full motion migration, OneSignal background push

---

## Risks
- **Virtualization + CSS columns** can be tricky; if the masonry breaks, fall back to chunked rendering (50 cards, load more on scroll).
- **`get_for_you_events` RPC** changes feed shape; will parity-check against current output before deleting old query.
- **Image transforms** require Supabase image transformation API — confirmed available on Lovable Cloud. External (non-storage) URLs pass through untouched.

---

## Execution order
1. Phase A (biggest wins)
2. Phase B (visual polish)
3. Phase C (native feel)
4. Phase D (last)
5. `hover:` sweep can run in parallel with any phase

Each phase ships independently.

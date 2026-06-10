## Problem
When a user already joined an event (the CTA shows **Unido**), tapping it immediately removes them from the guestlist via `handleLeaveGuestlist` with no confirmation. This can cause accidental un-joins.

## Goal
Show a native-style confirmation **bottomsheet** (Drawer from vaul) before actually leaving the guestlist.

## Changes

### 1. `src/hooks/useEventDetailState.ts`
Add `showLeaveConfirm` / `setShowLeaveConfirm` boolean state and expose it from the hook.

### 2. New component: `src/components/events/LeaveGuestlistDrawer.tsx`
A reusable bottomsheet using the project's existing `<Drawer>` (vaul) primitives:
- Title: "¿Salir de la lista?"
- Description: "Si abandonas la lista perderás tu lugar en este evento."
- Footer with two pill (`rounded-full`) buttons:
  - **Cancelar** (ghost variant) → closes drawer
  - **Salir de la lista** (destructive variant, brand-red `#E60023` background per project tokens) → calls `onConfirm` and closes drawer

### 3. `src/pages/EventDetail.tsx` & `src/components/events/EventDetailModal.tsx`
- In both files, locate the **Unido** button (`variant="ghost"` with `<Check /> Unido`).
- Change its `onClick` from `handleLeaveGuestlist` to `() => setShowLeaveConfirm(true)`.
- Render `<LeaveGuestlistDrawer>` below the floating CTA bar, passing:
  - `open={showLeaveConfirm}`
  - `onOpenChange={setShowLeaveConfirm}`
  - `onConfirm={handleLeaveGuestlist}`
  - `isPending={leaveGuestlistPending}`

### 4. No backend or mutation changes
`handleLeaveGuestlist` stays exactly the same; we only gate it behind the drawer.

## Files touched
- `src/hooks/useEventDetailState.ts`
- `src/components/events/LeaveGuestlistDrawer.tsx` (new)
- `src/pages/EventDetail.tsx`
- `src/components/events/EventDetailModal.tsx`

---

# 🔔 PENDING: Performance Audit — June 10, 2026
**Continue by June 12.** User asked to come back in 2 days.

## Real production data (last 7 days)
- 1,191 visitors, 11,505 pageviews, 96%+ mobile, 85% Bolivia
- Bounce rate 39-48%, 13.1 pageviews/visit, ~8.7 min sessions

## Key bottlenecks (ranked by impact)
1. **Write storm on preference tables** — 26,704 event_interactions inserts (105s DB time), 19,939 creator pref updates, 9,002 category pref updates. Every impression fires 6+ DB round trips.
2. **Cold start bundle** — FCP 6.5s, full load 7.1s, 1.86MB JS, 211 script requests. lucide-react 157KB untreeshaken, framer-motion 79KB loaded upfront.
3. **get_for_you_events RPC variance** — p50 53ms but p99 180-254ms.
4. **Web-vitals self-DDoS** — 4,967 inserts / 14.7s DB time.
5. **N+1 per-card** — 32k+ event_likes lookups, 5.3k eula_acceptances.
6. **Image pipeline** — No srcset/AVIF/aspect-ratio → 513 layout passes, 8s cumulative layout.
7. **DOM weight** — 5,959 nodes, 1,327 listeners. No feed virtualization.

## Three-phase improvement plan
**Phase 1** (highest ROI, lowest risk):
- Batch impression telemetry via client-side buffer + edge function
- Sample web-vitals to 10%
- Cache eula_acceptances in localStorage
- Tree-shake lucide-react (per-icon imports)
- Lazy-load framer-motion

**Phase 2**:
- Hydrate liked/saved/joined inside feed RPC
- Edge-cache nearby/trending first pages
- srcset + width/height + AVIF for images

**Phase 3**:
- Virtualize masonry feed
- Service-worker SWR for feed endpoint
- Materialized view for get_for_you_events

## Industry parallels
- IG/TikTok: batch telemetry every 5-10s, never on hot path
- Pinterest: AVIF + srcset + explicit aspect-ratio + masonry virtualization
- Shotgun: code-split per route, lazy icon packs
- All: sample RUM at 5-10%

## Next step
Remind user and ask which phase to start. Recommend Phase 1.

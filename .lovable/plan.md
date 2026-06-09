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
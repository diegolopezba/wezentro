## Plan: restore event-detail bottom sheets

### What I found
- The failing actions are all inside event detail views: comments, the comment preview row, and the owner `Gestionar` button.
- The profile `Seguidores` / `Siguiendo` sheet still works, which means the general sheet UI is not completely broken.
- The event detail modal uses a full-screen `framer-motion` draggable overlay at `z-[60]`.
- The new vaul bottom-sheet portal currently renders at `z-50`, below the event detail modal and its floating CTA at `z-[60]`.
- This can make a sheet open behind the event detail modal, while vaul still briefly locks interactions, matching the “delay/bug for a second, then nothing opens” behavior.

### Fix
1. Update the shared `bottom-sheet` wrapper so vaul sheets render above event detail overlays:
   - raise overlay/content z-index above modal routes and floating CTA bars;
   - keep the pointer-events cleanup safety net;
   - avoid background-scaling behavior.

2. Add event-modal compatibility:
   - ensure sheets opened from `EventDetailModal` are not hidden behind the modal layer;
   - prevent the page-level drag/swipe behavior from interfering with sheet interactions if needed.

3. Validate with a mobile smoke test:
   - open event detail;
   - tap comment icon;
   - tap comment preview row;
   - tap `Gestionar` on an owned event if available;
   - confirm the sheet appears visibly above the event detail page and the app remains scrollable after closing.

### Technical details
- Primary file: `src/components/ui/bottom-sheet.tsx`
- Likely small supporting file if drag conflict appears during testing: `src/components/layout/PageModal.tsx` or `src/components/events/EventDetailModal.tsx`
- No backend/database changes needed.
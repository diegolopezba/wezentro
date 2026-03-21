
## Convert ShareEventModal to a Bottom Sheet

One file to change: `src/components/events/ShareEventModal.tsx`.

Replace `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` with `Sheet` / `SheetContent side="bottom"` / `SheetHeader` / `SheetTitle`, following the exact same pattern used throughout the app (e.g. `FollowersSheet`, `MenuSheet`).

### Layout changes
- Container: `<Sheet>` + `<SheetContent side="bottom" className="rounded-t-3xl flex flex-col p-0">`
- Add a drag handle pill at the top (small centered bar, consistent with other sheets)
- Header: `<SheetHeader>` with `<SheetTitle>` inside a padded div
- Body: scrollable user list + search in a flex-grow area with padding
- Footer: Send + native share buttons pinned at the bottom with padding + safe area

### Height
Use `h-[75dvh]` — enough to show a comfortable list without taking over the full screen, consistent with `FollowersSheet`'s `h-[70vh]`.

### Files changed
| File | Change |
|---|---|
| `src/components/events/ShareEventModal.tsx` | Swap Dialog → Sheet (bottom), add drag handle, restructure layout into header/scroll-body/fixed-footer |

No prop interface changes — `eventId`, `open`, `onOpenChange` stay the same so all call sites (`EventDetail.tsx`, `EventDetailOverlay.tsx`) need zero changes.

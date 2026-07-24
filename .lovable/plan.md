## Goal

Replace the dropdown + separate Edit sheet + Delete AlertDialog on the event details page with **one** vaul bottom sheet that swaps between sub-views (native app pattern).

## New component

`src/components/events/EventActionsSheet.tsx` — a single `Drawer` (vaul) that renders one of three internal steps:

1. `root` — main list of actions
   - Owner: **Editar evento/post**, **Eliminar evento/post** (destructive)
   - Non-owner: **Reportar**
   - Everyone: **Copiar enlace**
2. `edit` — mounts the existing `EditEventSheet` form content inline (extract body, drop its own Drawer wrapper)
3. `delete` — inline confirmation screen ("¿Eliminar este evento? …" + Cancelar / Eliminar buttons) using the existing `useDeleteEvent` hook

Tapping a root row transitions the sheet to that step (no close/reopen). A back chevron in the sub-view header returns to `root`. Sheet closes only via drag-down or explicit Cancelar.

Structure:
```
<Drawer open onOpenChange>
  <DrawerContent>
    {step === 'root'  && <RootActions ... />}
    {step === 'edit'  && <EditView    ... />}
    {step === 'delete'&& <DeleteView  ... />}
  </DrawerContent>
</Drawer>
```

## Refactor of EditEventSheet

Split `EditEventSheet.tsx` into:
- `EditEventForm.tsx` — the current form JSX + logic, no Drawer chrome
- `EditEventSheet.tsx` — thin wrapper that keeps the old `open/onOpenChange` API by rendering `<Drawer>` around `<EditEventForm>` (so any other caller keeps working)

`EventActionsSheet` uses `EditEventForm` directly to avoid nested drawers.

## DeleteEventDialog

Left in place for any other caller, but on event detail we render the inline delete step instead. No AlertDialog inside the drawer.

## Wire-up

In both `src/pages/EventDetail.tsx` and `src/components/events/EventDetailModal.tsx`:
- Remove `DropdownMenu` block and the standalone `<EditEventSheet>` + `<DeleteEventDialog>` renders (and their `showEditSheet` / `showDeleteDialog` toggles for this entry point).
- Add local `const [actionsOpen, setActionsOpen] = useState(false)`.
- 3-dot button → `setActionsOpen(true)`.
- Render `<EventActionsSheet open={actionsOpen} onOpenChange={setActionsOpen} event={event} isOwner={isOwner} />`.
- Report / copy-link handlers move into the sheet.

## Z-index

vaul Drawer already renders above the detail modal via portal, so no z bump needed (fixes the "modal not showing" symptom that came from Dialog stacking under z-60).

## Out of scope

- No changes to payment modal, share modal, comments, or other sheets.
- No visual redesign beyond the new sheet contents (uses existing tokens, pill buttons, destructive color for delete).

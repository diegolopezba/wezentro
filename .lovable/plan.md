## Arreglar edición de items del menú

### Causa
`EditMenuSheet` ya tiene botones de lápiz que llaman `handleOpenItemDialog(item)` y abren un `<Dialog>` con el formulario prellenado. El problema es que ese `Dialog` se monta **dentro** de un `Sheet` abierto (ambos Radix, z-50, con focus trap). En móvil el Dialog queda detrás del overlay del Sheet / con focus trap robado, así que los taps no llegan al input y parece que "no se puede editar".

### Fix
Convertir los dos diálogos internos (item y categoría) en `Sheet` apilables encima del sheet padre, que es el patrón ya usado en el resto de la app (ej. `ReservationSheet`, `BusinessInfoSheet`).

- `src/components/menu/EditMenuSheet.tsx`
  - Reemplazar `<Dialog>` → `<Sheet side="bottom">` para "Agregar/Editar Item".
  - Reemplazar `<Dialog>` → `<Sheet side="bottom">` para "Agregar/Editar Categoría".
  - Mantener exactamente el mismo estado (`isItemDialogOpen`, `editingItem`, `itemForm`, etc.) y los mismos handlers (`handleSaveItem`, `handleSaveCategory`).
  - Conservar el botón ✏️ por fila (`MenuItemRow` → `onEdit`) — ya está cableado.
  - Footer con Cancelar / Guardar dentro del nuevo `SheetContent`.

### No cambia
- Hooks (`useUpdateMenuItem`, `useUpdateMenuCategory`) — ya funcionan.
- Schema / RLS.
- Estructura del menú, categorías, reordenar, switch de disponibilidad.
- El sheet principal de "Editar Menú" sigue igual.

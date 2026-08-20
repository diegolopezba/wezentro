# Unify bottom-sheet action buttons to white-on-dark / black-on-light

Standardize every primary action button inside bottom sheets so it matches the selected tier pill in the plan selector: white on dark sheets, black on light sheets. Secondary and destructive actions keep their own semantics.

## Scope

All sheets built from `src/components/ui/bottom-sheet.tsx` and `src/components/ui/drawer.tsx`, plus any `Drawer`-based sheet in `src/components/events/` (e.g. `PaymentQRModal`, `InviteFriendsSheet`). Primary CTAs such as "Quiero Profesional", "Continuar", "Confirmar Reserva", "Guardar cambios", "Invitar", "Entendido" become the new sheet-action style.

Out of scope: icon buttons, inline small buttons, link-style buttons, and buttons on full pages. The heart/like button and the unread notification dot keep their brand red per existing memory.

## What changes

1. **Button primitive**  
   Add a `sheet-action` variant to `src/components/ui/button.tsx` with `bg-foreground text-background font-semibold active:scale-[0.98]`. It reuses the same token logic as the existing `save` variant, but it is always highlighted so it is suitable for any sheet CTA.

2. **Primary CTAs in sheets**  
   Replace `variant="hero"`, `variant="default"`, and bare `<Button>` primary actions with `variant="sheet-action"` in:
   - `src/components/subscriptions/PlanSelector.tsx`
   - `src/components/events/PaymentQRModal.tsx`
   - `src/components/events/InviteFriendsSheet.tsx`
   - `src/components/events/TicketInfoSheet.tsx`
   - `src/components/events/EventActionsSheet.tsx` (confirm/delete sheet CTAs)
   - `src/components/reservations/ReservationSheet.tsx`
   - `src/components/reservations/ReservationScheduleEditor.tsx`
   - `src/components/reservations/ReservationRulesEditor.tsx`
   - `src/components/menu/EditMenuSheet.tsx`
   - `src/components/menu/MenuSheet.tsx`
   - `src/components/venue/AreaEditSheet.tsx` / `AreaPickerSheet.tsx`
   - `src/components/profile/FollowersSheet.tsx`
   - `src/components/moderation/ReportSheet.tsx`
   - `src/components/map/FilterSheet.tsx`
   - `src/components/events/TicketTierPicker.tsx`
   - `src/components/events/ShareEventModal.tsx` / `BusinessRequiredSheet.tsx` / `BeneficiaryRequiredSheet.tsx` / `GuestlistManagementSheet.tsx`
   - Other sheet-style CTAs found during the audit pass.

3. **Secondary/cancel actions stay as ghost/outline**  
   "Cancelar", "Ahora no", back actions, and low-emphasis options remain muted so the sheet still has a clear hierarchy.

4. **Destructive actions remain destructive**  
   "Eliminar", "Bloquear", "Reportar" keep their existing semantic style; only their container is rounded and full-width where needed.

5. **Save/dirty buttons**  
   Keep the existing `save` / `saveVariant` flow for forms (EditEventSheet, EditProfile, BusinessInfo, ReservationScheduleEditor, ReservationRulesEditor) so the save button stays muted until changes are made and lights up with the same `bg-foreground text-background` look when dirty. No regression in the dirty-state affordance.

## Visual result

- In a dark sheet: every primary CTA is a filled white pill with black text.
- In a `light-sheet`: every primary CTA is a filled black pill with white text.
- The selected tier pills in the plan selector already use this same token pair, so the CTA and the active pill now match exactly.

## Verification

- Typecheck the changed components.
- Open the preview on a mobile-sized viewport and trigger each sheet to confirm the CTA contrast is readable and the pill radius is consistent.
- Confirm that the red heart and notification dot still use the brand-red token.

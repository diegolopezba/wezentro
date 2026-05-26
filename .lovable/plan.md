## Quick Fix: Profile buttons ignore menu/reservations toggles

**Problem:** On `Profile.tsx` (own profile view), the "Editar Menú" and "Reservas" buttons are visible for all food businesses unconditionally, ignoring the `menu_enabled` and `reservations_enabled` toggles set in Business Settings.

**UserProfile.tsx already handles this correctly:** it checks `menu_enabled !== false` and `reservations_enabled !== false` before showing those buttons/sheets. `Profile.tsx` does not.

**Fix:**

1. In `Profile.tsx`, read `menu_enabled` and `reservations_enabled` from the `profile` object (same pattern as `BusinessSettings.tsx` and `UserProfile.tsx`):
   - `const menuEnabled = (profile as any)?.menu_enabled !== false;`
   - `const reservationsEnabled = (profile as any)?.reservations_enabled !== false;`

2. Wrap the "Editar Menú" button in `menuEnabled` condition.

3. Wrap the "Reservas" button in `reservationsEnabled` condition.

4. Also gate the bottom-sheet renders (`EditMenuSheet`, `ReservationsManagementSheet`) with the same toggles so they don't mount unnecessarily.

This is a 2-file change with no architectural impact.
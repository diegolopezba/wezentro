
## Business Hours & Reservation Times — Full Plan

### What exists today
- `business_hours` is a free-text `TEXT` field on `profiles` (e.g. "Lun-Vie: 9:00-18:00"). It is edited in **EditProfile**, displayed in **BusinessInfoSheet**, and passed as a prop to **ReservationSheet** where it is only shown as a hint on the date step — it is never used to filter time slots.
- `reservation_capacity` is stored on `profiles` but gated behind `isFoodBusiness`, which is wrong. All businesses with reservations enabled should have it.
- **ReservationSheet** generates all 30 fixed TIME_SLOTS from 08:00–22:30 regardless of what the business owner has set.
- **BusinessSettings** (`/settings/business`) is the right home for business-operational config but currently has no hours/reservation-times section.

### What needs to change

**1 — Database migration**
Add two new columns to `profiles`:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reservation_start_time TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS reservation_end_time   TIME DEFAULT '22:00';
```
These store only the window during which the business accepts reservations (independent of general `business_hours`). `business_hours` stays as free-text for display purposes in the info sheet.

**2 — Move business info editing to BusinessSettings**
In `src/pages/BusinessSettings.tsx`, add a new "Información del negocio" section (only when `isBusiness`) with:
- **Horarios de atención** (`business_hours`) — same Textarea that currently lives in EditProfile
- **Teléfono** (`business_phone`) — same Input that currently lives in EditProfile
- These save directly on blur/button via a "Guardar" button within the section
- Remove both fields from `src/pages/EditProfile.tsx` (keep location picker and capacity there for now since those are more profile-level)

Actually — cleaner approach: move ALL business-operational fields to BusinessSettings, and keep EditProfile purely for personal identity (name, username, bio, avatar, birthdate, gender). The "Información del Negocio" section in EditProfile is removed entirely.

**3 — Add reservation window picker to BusinessSettings**
Below the Reservations toggle (only when `reservationsEnabled`), show an expandable sub-section:
- "Horario de reservas" with two time selects: **Desde** / **Hasta** (30-minute grid dropdowns)
- "Capacidad por horario" — the numeric input for `reservation_capacity` (moved from EditProfile, now available to ALL businesses with reservations, not just `isFoodBusiness`)
- Saved inline with a small "Guardar" button

**4 — Filter time slots in ReservationSheet**
`ReservationSheet` already receives `businessHours` as a prop but ignores it for filtering. 

Change the prop interface to also accept `reservationStartTime` and `reservationEndTime` (strings like `"12:00:00"`). Use them to filter `TIME_SLOTS`:
```ts
const filteredSlots = TIME_SLOTS.filter(slot => {
  if (!start || !end) return true; // no restriction set
  return slot >= start.slice(0,5) && slot < end.slice(0,5);
});
```
If no reservation window is set, all slots remain available (backwards-compatible).

**5 — Pass the new fields from UserProfile → ReservationSheet**
In `src/pages/UserProfile.tsx`, the `userProfile` object is fetched via `useUserProfile`. Add `reservation_start_time` and `reservation_end_time` to the `UserProfile` type in `useUserProfile.ts` and pass them as props to `ReservationSheet`.

**6 — Update AuthContext profile type + EditProfile cleanup**
- Add `reservation_start_time`, `reservation_end_time` to the `Profile` type in `AuthContext.tsx`
- Remove the entire "Información del Negocio" section from `EditProfile.tsx` (hours, phone, capacity fields, and the section heading + note)

---

### Files changed

| File | Change |
|---|---|
| `supabase/migrations/new` | Add `reservation_start_time`, `reservation_end_time` columns |
| `src/pages/BusinessSettings.tsx` | Add business info section (hours + phone) + reservation window picker + capacity |
| `src/pages/EditProfile.tsx` | Remove entire "Información del Negocio" business section |
| `src/contexts/AuthContext.tsx` | Add new time columns to Profile type |
| `src/hooks/useUserProfile.ts` | Add new time columns to UserProfile type |
| `src/pages/UserProfile.tsx` | Pass `reservationStartTime` + `reservationEndTime` to ReservationSheet |
| `src/components/reservations/ReservationSheet.tsx` | Accept + apply time filter on TIME_SLOTS |

No change to `business_hours` free-text column — it stays as-is for the info sheet display.

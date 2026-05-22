## Why the button is missing

The "Editar Menú" button (and "Reservas" shortcut) on the Profile page is gated by `profile.is_food_business === true`. In `src/pages/Profile.tsx`:

```
{isBusiness && isFoodBusiness && (
  <Button ...>Editar Menú</Button>
)}
```

When you pick "Restaurante" in **Business → Información del negocio**, `handleBusinessTypeChange` only writes `business_type: "restaurant"` to the profile. It never sets `is_food_business`, so that flag stays `false` and the menu button stays hidden. Same reason your account doesn't see the "Reservas" inline button on the profile.

(The `Menú` toggle in Business Settings is separate — it controls `menu_enabled`, which only hides/shows the menu on your public profile. It doesn't unlock the editor.)

## Plan

Single small change in `src/pages/BusinessInfo.tsx` → `handleBusinessTypeChange`:

- When the selected `business_type` is one of the food categories (`restaurant`, `coffee`, `bar`), also update `is_food_business: true`.
- When it's any other type, set `is_food_business: false`.
- Keep one `.update({...})` call so it's atomic, then `refreshProfile()` as today.

After this, selecting "Restaurante" will immediately make the "Editar Menú" and "Reservas" buttons appear on your profile.

## Where to find the menu editor (right now, before the fix)

There is no separate "Add menu" entry in Settings. The only entry point is the **Editar Menú** button on your own Profile page, which opens `EditMenuSheet`. It just isn't rendering for your account because of the flag above.

## Not in scope

- No DB migration, no schema changes.
- No changes to `menu_enabled` behavior or to `BusinessSettings.tsx`.
- No changes to the public profile menu rendering.

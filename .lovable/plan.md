## Problem
In `EditEventSheet.tsx` the "Ubicación" field is just a plain `<Input>` bound to `location_name`. There's no geocoding search dropdown and no map — that's why typing a new address doesn't show suggestions or a map, and selecting a new spot is impossible. The Create page uses the proper `LocationPicker` component (search + draggable pin); the Edit sheet was never wired up to it.

A secondary consequence: even if the user typed a new address string, `latitude` / `longitude` were never updated, so the map pin on the event detail page would still point to the old coordinates and the secret-location notification would not fire correctly.

## Fix

**`src/components/events/EditEventSheet.tsx`**
- Import `LocationPicker` from `@/components/map/LocationPicker`.
- Extend the `event` prop type and `formData` state with `latitude: number | null` and `longitude: number | null`, hydrated from the event (both on mount and in the `useEffect` reset when the sheet opens).
- Replace the current `<Label htmlFor="location">` + `<Input id="location">` block with:
  ```tsx
  <LocationPicker
    value={{
      address: formData.location_name,
      latitude: formData.latitude,
      longitude: formData.longitude,
    }}
    onChange={(loc) =>
      setFormData({
        ...formData,
        location_name: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
      })
    }
  />
  ```
- Include `latitude` and `longitude` in the `updateEvent` mutation payload (alongside `location_name`).

**`src/pages/EventDetail.tsx`**
- When opening `EditEventSheet`, pass `latitude` and `longitude` from the loaded event so the picker hydrates with the existing pin (small prop addition; no logic change).

No DB/migration work — `useEventMutations.UpdateEventData` already accepts `latitude` / `longitude`, and the secret-location change trigger we shipped already watches those columns, so editing the location on a secret event will continue to notify approved guests automatically.

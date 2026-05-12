## Goal

When a user selects a category pill on the Discover map (e.g. Restaurante, Café, Bar, Rooftop, Fitness, Arte y Cultura), the map should hide events and instead show pinned dots for every business profile whose `business_type` matches that pill — using the address/coordinates each business set on **Información del negocio** (the LocationPicker we just added supports both search and drag-pin, so no UI change is needed there).

Tapping a business pin opens a small popup with avatar/name/address; tapping the popup navigates to `/user/{id}`.

## Pill ↔ business_type mapping

| Pill (value)   | business_type values shown |
|----------------|----------------------------|
| `restaurant`   | `restaurant`               |
| `coffee`       | `coffee`                   |
| `bar`          | `bar`                      |
| `rooftop`      | `rooftop`                  |
| `fitness`      | `gym`                      |
| `culture`      | `gallery`                  |
| `party`        | `club`                     |
| `concert` / `festival` | (no business mapping → events behave as today) |

Multiple pills can be active at once → union of their mapped business_types is shown.

## Changes

1. **`src/hooks/useFoodLocations.ts` → rename to `useBusinessLocations`**
   - Accepts a `types: string[]` argument.
   - Queries `profiles` filtered by `business_type IN (types)` with non-null `business_latitude`/`business_longitude` (drops the `is_food_business` constraint, which is no longer the gating concept).
   - Disabled when `types` is empty.

2. **`src/pages/Discover.tsx`**
   - Add a `PILL_TO_BUSINESS_TYPES` map.
   - Compute `businessTypesToShow` from `filters.categories`.
   - Replace `useFoodLocations()` with `useBusinessLocations(businessTypesToShow)`.
   - `showBusinessMarkers = businessTypesToShow.length > 0`.
   - When `showBusinessMarkers` is true: pass `events={[]}` to MapView (only business pins) and pass the fetched locations + `showBusinessMarkers` flag.

3. **`src/components/map/FoodMarker.tsx` → rename to `BusinessMarker.tsx`**
   - Same visual style (red dot with avatar). Popup shows avatar, full_name/username, address, and on tap navigates to `/user/{profile.id}`.

4. **`src/components/map/MapView.tsx`**
   - Rename internal `foodLocations`/`showFoodMarkers`/`onFoodMarkerClick` props/effects to `businessLocations`/`showBusinessMarkers`/`onBusinessMarkerClick` (behavior identical — same effects that clear/create custom markers and skip event clustering when active).

## Out of scope

- No DB schema changes (uses existing `business_type`, `business_latitude`, `business_longitude` columns on `profiles`).
- No changes to BusinessInfo (LocationPicker already supports manual pin drag).
- Event-only pills (`concert`, `festival`) keep current behavior.

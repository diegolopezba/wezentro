# Mini map in the business "Información" sheet

Show a small light-theme map inside the business info sheet when the business has a saved address with coordinates. It loads only after the user opens the sheet — nothing extra is fetched or downloaded while browsing the profile.

## What the user sees

- In the "Ubicación" block of the info sheet, below the address text: a compact map (about 140px tall, rounded corners) centered on the business with a red Zentro pin.
- Tapping the map opens the location in the phone's maps app (same behaviour as elsewhere in the app).
- If the business saved only a text address with no coordinates, the block stays exactly as it is today — text only, no empty map box.
- A brief spinner placeholder shows while the map loads.

## Performance guarantees

- The map component is code-split (lazy import), so the Mapbox library is downloaded only the first time a user opens an info sheet with coordinates.
- The Mapbox token request happens inside that lazy component, so it never fires on profile page load.
- The map instance is created on open and destroyed on close; the sheet is already conditionally rendered.
- No new database queries: the profile record already returns the coordinate fields.

## Technical notes

- New `src/components/profile/BusinessMiniMap.tsx`: takes `latitude`, `longitude`, `name`; uses `useMapboxToken` and `mapbox-gl` with the light style (`mapbox://styles/mapbox/light-v11`), interaction disabled (no drag/zoom/rotate), `attributionControl: false`, plus a `resize()` after the sheet animation and a `ResizeObserver` — mirroring `LocationSheet.tsx`.
- `BusinessInfoSheet.tsx`: add optional `latitude` / `longitude` props; render `<Suspense>` + `React.lazy(() => import("./BusinessMiniMap"))` only when the sheet is open and both coords are finite numbers.
- Pass `business_latitude` / `business_longitude` from `src/pages/Profile.tsx` (auth profile) and `src/pages/UserProfile.tsx` (viewed profile); add those two fields to the `UserProfile` type in `src/hooks/useUserProfile.ts` (the query already uses `select("*")`).

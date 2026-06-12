## Goal
Whenever the location is visible (public event, or secret event for the owner/approved guests), let users tap the location row to open a bottom sheet that shows a Mapbox map of the spot plus the location name. The locked "Ubicación secreta" card stays as-is (no map).

## What to build

1. **New component** `src/components/events/LocationSheet.tsx`
   - Bottom sheet (Radix `Sheet` with `side="bottom"`, rounded top corners, matches existing sheet styling used across the app).
   - Props: `open`, `onOpenChange`, `locationName`, `latitude`, `longitude`, `isSecret`.
   - Header: location name + small `Secreta` chip when `isSecret`.
   - Body: read-only Mapbox map (`mapbox-gl`, token via existing `useMapboxToken`), centered on `[longitude, latitude]` with a single pin (brand red). Disable rotation/pitch; allow pinch zoom + drag.
   - Fallback when no coords: show just the name and a muted "Mapa no disponible" note.
   - Optional small "Abrir en Mapas" link using `https://www.google.com/maps/search/?api=1&query=lat,lng` (or name fallback). Tappable, opens in new tab — keeps parity with native expectations without extra deps.

2. **Wire it into `src/pages/EventDetail.tsx`** (lines ~277-287)
   - Wrap the visible location row in a `button` that sets `showLocationSheet=true`.
   - Add chevron/arrow affordance (subtle, e.g. tiny `ChevronRight`) so it's clearly tappable.
   - Render `<LocationSheet ... />` near the other sheets at the bottom of the component.

3. **Wire it into `src/components/events/EventDetailModal.tsx`** (lines ~295-303)
   - Same change: make the visible row a tappable button, mount `<LocationSheet />`.

4. **State** lives locally in each parent (`const [showLocationSheet, setShowLocationSheet] = useState(false)`). No changes needed in `useEventDetailState`.

## Out of scope
- The locked secret-location card remains non-interactive (no map for non-approved viewers).
- No changes to data layer, hooks, or DB.
- No directions/routing UI beyond the optional "Abrir en Mapas" link.

## Technical notes
- `mapbox-gl` is already a dependency (used by `LocationPicker` / `MapView`); we'll instantiate a minimal read-only map inside the sheet, cleaning up on unmount.
- Use `useMapboxToken()` to fetch the token; show a small skeleton while loading.
- Active-state styling on the tappable row (no `hover:` per project rules).

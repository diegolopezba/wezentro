Hide the "Planos del lugar" section on the business settings page until the venue layout feature is more developed.

## Background
- The business settings page currently lists a "Planos del lugar" button (lines 182–199 in `src/pages/BusinessSettings.tsx`) that links to `/settings/business/layouts`.
- The venue layout feature is partially built but not yet polished enough for users to access it.
- The user wants the section hidden until the feature is more developed.

## Change
- Conditionally hide the "Planos del lugar" button in `src/pages/BusinessSettings.tsx`.
- Default it to hidden so the route still exists but the entry point is removed.
- Leave an easy toggle/comment so it can be re-enabled later.

## Scope
- Only the `BusinessSettings.tsx` presentation is affected.
- No backend, routing, or venue layout code is changed.

## Validation
- Open `/settings/business` on a business account.
- Confirm the "Planos del lugar" button is no longer visible.
- Confirm the rest of the settings list (Business Dashboard, Información, Menú, Reservas, Ventas y promotores, Pagos) renders correctly.

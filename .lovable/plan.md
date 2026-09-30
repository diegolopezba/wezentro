# Business accounts land on the homepage + guided tour

## What changes

1. **After setup, go home.** Pressing "Completar después" or "Listo, ir a mi cuenta Business" opens the homepage (Inicio) with the normal bottom menu, instead of Settings > Business. Food businesses no longer go straight to the plans page; the tour points to it instead.

2. **Light pointer tour on first arrival.** A short tour with a highlight ring and a small card next to it ("1 de 5", Siguiente / Omitir):
   - **Inicio**: "Así ven tu contenido las personas cerca tuyo."
   - **Crear (+)**: "Tu primer paso: publicá un evento o un post." Card has a "Crear mi primera publicación" button that opens Crear.
   - **Gestión**: "Acá manejás tus eventos, entradas, invitados y reservas."
   - **Perfil**: "Tu página pública: lo que ven tus clientes."
   - **Configuración Business** (last card, no highlight target needed): "Completá tu información, pagos y plan cuando quieras desde Perfil > Configuración > Business." Button "Empezar".
   - Shown once per account; tapping outside or "Omitir" ends it. Works on phone (bottom menu) and desktop (side menu).

3. **Finish setup reminder.** If the business info or payments are incomplete, a small dismissible card at the top of Inicio: "Terminá de configurar tu negocio" that opens Settings > Business (the existing checklist). Hidden once done.

## Technical details

- `BusinessSetup.tsx`: `finish()` and `skipAll()` navigate to `/` with `state: { businessTour: true }`.
- New `BusinessHomeTour` component mounted in the home page for business accounts; targets `data-tour="nav-home|nav-create|nav-gestion|nav-profile"` attributes added to `BottomNav` and `DesktopNavRail` items. Rendered via portal, light card style, rounded-full buttons, semantic tokens, `active:` states only, haptic on step change.
- Completion stored in localStorage per user id (`business-tour:<userId>`), triggered by the navigation state or first business visit without the flag.
- Reminder card uses existing profile fields (`business_address`) and `useDashboardAccess().hasPayouts`; dismiss stored in localStorage.
- No backend changes.

## Verification

- Playwright at phone size: finish setup → lands on Inicio, tour runs through all steps, "Crear mi primera publicación" opens Crear, tour doesn't reappear on reload; check desktop layout too.

# Dashboard: vertical left tab menu on desktop

## Goal
On desktop (`lg+`), the Dashboard tab pills (Overview, Ventas, Promotores, Audiencia, Contenido, Acciones, Reservas, Próximamente) move from the horizontal scrollable pill row into a vertical left-side menu, matching the Gestión Eventos sidebar pattern. Mobile keeps the current horizontal pills unchanged.

## Changes

1. **`src/pages/BusinessDashboard.tsx`**
   - Wrap header + content in `BusinessPageContainer` (part of in-progress Phase 2).
   - On `lg+`, render a sticky vertical tab list on the left (w-56): label + icon per tab, active state highlighted, same tab values/state (`activeTab` / `setActiveTab`) — no logic changes.
   - Hide the horizontal scrollable pill row on `lg+` (keep for mobile).
   - Content area sits to the right of the sidebar, wider grids from Phase 2 still apply.

2. **`src/components/dashboard/OverviewTab.tsx`** (Phase 2 continuation)
   - Desktop-wide stat grids and side-by-side conversion funnel / sales pace as already planned — presentation only.

3. **Consistency**
   - Same visual language as the Gestión > Eventos desktop sidebar (rounded, light surface, active pill highlight).
   - Tab icons reuse existing lucide icons; no new dependencies.

## Out of scope
- Mobile layout and Capacitor behavior.
- Any data, hook, RPC, or metric changes.
- Promotores/Audience/etc. tab content restructures (only their container moves).

## Verification
- Typecheck + build pass.
- Playwright at 1440px: vertical menu visible, tabs switch content, active state correct.
- Playwright at 390px: horizontal pills unchanged, no layout regressions.

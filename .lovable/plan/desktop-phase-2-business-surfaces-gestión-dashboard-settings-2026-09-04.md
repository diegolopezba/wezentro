# Desktop Phase 2 — Business surfaces (Gestión, Dashboard, settings)

Goal: make every business-side screen feel native on a wide screen, reusing the desktop shell and split-layout patterns from Phase 1. Mobile/Capacitor output stays byte-identical in behaviour — all changes are `lg:` structure classes only.

## What changes

### 1. Shared desktop container
A small `BusinessPageContainer` wrapper (max width, centered, wider gutters at `lg+`) applied to Gestión, Dashboard and all business settings pages, so content stops stretching edge-to-edge next to the nav rail.

### 2. Gestión (`BusinessHub`)
- Header becomes a wide bar: title left, tab pills centered/left, Dashboard button right.
- **Eventos tab**: on desktop the event pill strip becomes a left sidebar list (event thumbnail, name, date, status), with the event detail panel to the right — the same media-left/detail-right rhythm as the consumer pages. Mobile keeps the scrollable pill row.
- **Reservas / Experiencias tabs**: on desktop the day picker + daily totals + filters become a sticky left column, and the timeline/cards fill a wider right column with 2-column card rows when space allows.
- Reservation / booking / lounge detail bottom sheets render as centered desktop dialogs (existing desktop sheet treatment), so no more full-width sheet on a 1440px screen.

### 3. Dashboard / Analytics
- Header and tab strip go full-width inside the container; tabs stay pills.
- Stat grids widen (`xl:grid-cols-4` → up to 6 where there are more cards), charts move to a 2-column grid at `xl`, conversion funnel and sales pace sit side by side instead of stacked.
- Tables (events performance, promoters) get their natural wider layout instead of horizontal scroll.

### 4. Business settings & subpages
`BusinessSettings`, `BusinessInfo`, `BusinessMenu`, `BusinessPlans`, `BusinessPaymentSettings`, `BusinessExperiences`, `VenueLayouts`, `BusinessSetup`: centered single column (comfortable reading width) with the existing dark header bar spanning the container. Menu and venue-layout editors get a media/preview-left, controls-right split at `lg+` where they already have a visual canvas.

### 5. Event detail panel (`EventDetailPanel`)
Summary card + stat tiles widen; tab panels (Entradas / Lounges / Invitados / Promotores) use 2-column card grids on desktop.

## Technical notes
- No data, hook, RPC, payment or database changes. Presentation only.
- New file: `src/components/layout/BusinessPageContainer.tsx`; reuse `DetailSplitLayout` where a real two-pane split fits.
- Breakpoint stays `lg` (1024px), consistent with `useIsDesktop`.
- Verification: typecheck + build, plus Playwright screenshots at 1440px for Gestión (all three tabs), Dashboard (overview + reservas) and two settings pages; a 390px pass to confirm mobile is unchanged.

## Out of scope
- Admin panel (`src/pages/admin`) unless requested next.
- Any redesign of business logic, metrics definitions or copy.

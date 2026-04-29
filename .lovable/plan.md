# Advertiser Time & Day Targeting for Sponsored Ads

Let advertisers control **when** their ads run — specific days of the week and a daily time window — via an "Opciones avanzadas" step in the boost wizard.

## What gets built

### New wizard step: "Horario" (between Audiencia and Presupuesto)
- **Días de la semana**: 7 toggle pills (L M X J V S D). Default: all selected.
- **Horario del día**: two modes
  - "Todo el día" (default)
  - "Horario específico" — two time pickers (Desde / Hasta). Supports overnight windows (e.g., 18:00 → 02:00).
- Helper note: *"Tu anuncio no se muestra ni consume presupuesto fuera de este horario (hora de Bolivia)."*
- Skippable — defaults mean "always show".

### Confirm step
Adds a "Horario" row to the summary card, e.g. `L–V · 18:00–02:00` or `Siempre activo`.

### Campaign card (dashboard)
Compact schedule chip under the title when a custom schedule is set.

## Database changes (migration)

Add 4 columns to `sponsored_posts`:
- `target_days_of_week int[]` — 0–6 (Sunday=0). NULL = all days.
- `target_hour_start int` (0–23, nullable)
- `target_hour_end int` (0–23, nullable). Both null = all day. If end < start, window crosses midnight.
- `target_timezone text NOT NULL DEFAULT 'America/La_Paz'`

Add a validation **trigger** (not a CHECK — project rule) ensuring the hours are both set or both null and within 0–23, and days are all 0–6.

## RPC update: `get_eligible_sponsored_posts`
Append two filters using `now() AT TIME ZONE sp.target_timezone`:
- DOW filter via `EXTRACT(DOW FROM ...) = ANY(sp.target_days_of_week)`
- Hour filter with overnight-window CASE handling

This means **no impressions served outside the window → no budget consumed**. No lifecycle/cron changes required.

## Frontend changes
- `src/hooks/useSponsoredPosts.ts` — extend `SponsoredPost` interface; extend `useCreateSponsoredPost` mutation params; persist schedule on the existing edit-update path in `PromocionesSection.tsx`.
- `src/components/dashboard/PromocionesSection.tsx`
  - Add wizard state: `selectedDays: number[]`, `useCustomHours: boolean`, `hourStart: string`, `hourEnd: string`.
  - Insert new step "Horario" between current steps 1 (Audiencia) and 2 (Presupuesto). `STEPS` array becomes 5 entries.
  - Hydrate state from `sp` on edit (`openEditWizard`).
  - Persist via both create and update paths in `handleCreate`.
  - Render schedule summary chip on each campaign card.
- Helper `formatSchedule(days, hStart, hEnd)` for compact display.

## Out of scope
- Different hours per day (single global window only)
- Multiple windows per day
- Per-viewer timezone (always advertiser's tz)
- Lost-impressions reporting

# Plan: More contextual onboarding bottom-sheets

## Goal

Identify high-friction user and business flows where a first-time, re-openable onboarding bottom-sheet would reduce confusion and increase conversion. Implement the top-priority sheets using the existing `FeatureIntroSheet` + `useFeatureIntro` pattern.

## Current state

- **Onboarding page** (`/onboarding`) covers profile basics (username, name, gender, birth date).
- **BusinessIntroSheet** is shown when a user toggles on Business in Settings.
- **FeatureIntroSheet** is already used for Create, Experiencias, Menú, and Reservas with a `?` header button.
- Business conversion is driven by a Settings promo card and a setup checklist.
- Several screens have empty states but no "how this works" explainer.

## Top priority gaps

### 1. Event detail (guest-side action confusion)

The floating action button can mean many things depending on the event: "Unirse" (free guestlist), "Comprar" (paid ticket), "Reservar" (restaurant/experience), "Reservar experiencia" (linked experience), or accept a special invite. Add a `EVENT_ACTIONS_INTRO` sheet shown the first time a user opens an event detail and re-openable from the action bar.

**Content:**

- Diferencia entre guestlist, entrada y reserva
- Ubicación secreta y cómo se revela
- QR de entrada y dónde se guarda
- Invitaciones especiales

### 2. Tickets & Reservations tab

Users now have one tab at `/tickets` with two sub-tabs (`Entradas` / `Reservas`). It is not obvious which ticket belongs where or how to show the QR at the door. Add a `TICKETS_INTRO` sheet shown on first visit.

**Content:**

- Entradas = eventos pagados / guestlist confirmada
- Reservas = mesas en restaurantes
- QR: mostrarlo en entrada, no compartirlo públicamente
- Historial "Pasadas"

### 3. Business Dashboard

The dashboard has 8 tabs (Overview, Ventas, Promotores, Audiencia, Contenido, Acciones, Reservas, Próximamente). New business owners do not know where each metric comes from or how to act on it. Add a `BUSINESS_DASHBOARD_INTRO` sheet shown the first time a business reaches `/dashboard`.

**Content:**

- Qué mide cada tab
- De dónde vienen los ingresos
- Cómo usar "Acciones" para promocionar
- El embudo de conversión

### 4. Business Sales / Payouts

Business owners need to understand the payout flow (Qhantuy → deposit next day, 5% commission for tickets, subscription for food reservations). Add a `SALES_PAYOUTS_INTRO` sheet on first visit to `/settings/business/sales` and `/settings/business/payments`.

**Content:**

- Cómo se calculan los ingresos
- Comisiones (5% por ticket, 0% por reservas con plan)
- Cuándo llega el dinero
- Qué pasa si falta un beneficiario



## Implementation plan

1. **Extend the shared pattern**
  - Add new step arrays to `src/components/business/featureIntroSteps.ts`:
    - `HOME_FEED_INTRO`
    - `EVENT_ACTIONS_INTRO`
    - `TICKETS_INTRO`
    - `NOTIFICATIONS_INTRO`
    - `BUSINESS_DASHBOARD_INTRO`
    - `SALES_PAYOUTS_INTRO`
    - `PRIVACY_INTRO`
    - `DISCOVER_INTRO`
  - Reuse the existing `FeatureIntroSheet` and `useFeatureIntro` hook.
2. **Integrate into each page**
  - `src/pages/Index.tsx`: add `useFeatureIntro("home")` and a `?` button in the header.
  - `src/pages/EventDetail.tsx`: add `useFeatureIntro("event")`, show only on first event open, and add a "¿Cómo funciona?" option in the actions menu.
  - `src/pages/MyTickets.tsx`: add `useFeatureIntro("tickets")` and a `?` header button.
  - `src/pages/Notifications.tsx`: add `useFeatureIntro("notifications")` and a `?` header button.
  - `src/pages/BusinessDashboard.tsx`: add `useFeatureIntro("dashboard")` and a `?` header button.
  - `src/pages/BusinessSales.tsx`: add `useFeatureIntro("sales")` and a `?` header button.
  - `src/pages/BusinessPaymentSettings.tsx`: add `useFeatureIntro("payments")` and a `?` header button.
  - `src/pages/PrivacySettings.tsx`: add `useFeatureIntro("privacy")` and a `?` header button.
  - `src/pages/Discover.tsx`: add `useFeatureIntro("discover")` and a `?` header button.
3. **Keep it lightweight**
  - Each intro is 1-2 slides max.
  - Storage key: `feature-intro:<key>`.
  - No backend changes; no new tables.
  - Preserve the dark-sheet-on-dark-page, light-sheet-on-light-page convention (`light-sheet` on sheets).
4. **QA**
  - Verify each `?` button reopens the sheet.
  - Confirm intro does not auto-open again after dismiss.
  - Ensure no layout regressions on mobile.

## Scope

- This pass is **frontend-only** onboarding content.
- No changes to business logic, pricing, or RLS.
- No new dependencies.

## Success metric

- First-time users should be able to explain what each core page does without guessing.
- Business users should understand the dashboard, payout timing, and how their actions map to revenue.
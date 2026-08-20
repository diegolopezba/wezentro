# Store-ready polish + new plan-tier UI

Two parts: a redesign of the subscription plan screens in the Revolut "Select plan" style, and a safe-fix pass so bottom sheets and screens behave correctly as an installed app (PWA + Capacitor shell).

## Part 1 — Plan tiers, Revolut style

Applies to both the full page (`/settings/business/plans`) and the `PlansSheet` bottom sheet, sharing one component so they never drift.

Structure, top to bottom:
- Title ("Planes") with a discreet "Omitir"/close action on the right.
- A horizontally scrollable pill row of tier names (Básico · Profesional · Elite), current selection filled, the rest muted. Scrolls the selected pill into view; swiping the card also changes the selected pill.
- One large hero card per tier: tier name in big type, price line ("Bs. X/mes" or "Gratis · Lo básico"), a short tagline, and a badge in the corner — "Activo" for the current plan, "Recomendado" for the highlighted one.
- "Funciones destacadas" section: each feature as an icon + bold title + one-line grey description inside a soft rounded container, matching the reference spacing.
- A sticky CTA at the bottom: "Tu plan actual" (disabled) when active, otherwise "Quiero Profesional" / "Ver precios". Sticky above the safe-area inset on the page, pinned to the sheet footer in the sheet.

Colors follow the existing monochrome system: dark page, light sheet, no red. Feature copy comes from the tier config so the content stays a single source of truth.

## Part 2 — Store-ready / PWA safe fixes

Audit-driven, no structural refactors:
- Safe areas: verify every full-screen page header uses the top inset and every sticky footer/CTA uses the bottom inset, so nothing hides under the notch or the home indicator.
- Bottom sheets: consistent 24px top radius, max height tied to the visible viewport, bottom padding that clears the home indicator, and one scrollable content region so long sheets never overflow off-screen.
- Manifest and icons: confirm name, short name, theme/background color, standalone display, portrait orientation, and 192/512/maskable icons; add any missing Apple touch icon sizes.
- Service worker: confirm navigation requests stay network-first with cache fallback and that auth/API/OAuth paths are never cached, so an installed app never serves a stale shell.
- Offline: make sure the offline fallback shows instead of a blank screen when the network drops mid-session.
- Standalone checks: no browser-only assumptions (no reliance on browser back chrome), status-bar color matches the app background, and pull-to-refresh / overscroll behave inside the installed shell.

## Technical notes

- New shared component `src/components/subscriptions/PlanSelector.tsx` rendering tabs + hero card + features; `BusinessPlans.tsx` and `PlansSheet.tsx` become thin wrappers passing a `variant` of page or sheet.
- `src/lib/subscriptionTiers.ts` gains a `features` array of `{ icon, title, description }` per tier for the "Funciones destacadas" block, keeping the existing `bullets` and feature-key gating untouched.
- Gating logic, `useSubscriptionTier`, and `subscriptionBilling.ts` are not touched — the CTA still calls `startSubscriptionCheckout`.
- PWA work stays in `index.html`, `vite.config.ts` manifest, `public/sw.js`, and per-component padding/height classes; no service-worker rewrite and no new PWA library.

## Out of scope

Real Qhantuy recurring billing, plan-change/proration logic, and any change to event/ticketing business accounts.

# Fix the "Soy empresa" flow confusion

Two issues from testing, one is expected behavior that isn't communicated, one is a real bug.

## 1. "Crear mi cuenta Business" sends you to the login page

This is how it works today, and it is the intended flow: an account must exist before it can become a Business account. What's missing is any signal that you're in the business flow — the auth screen looks identical to a normal signup.

What happens under the hood (already implemented): tapping the CTA stores a "business intent" flag, you sign up normally, complete the basic profile onboarding, and are then sent straight into the Business setup wizard (category → info → bank details), which is the step that actually flips the account to Business. So yes, it does end up as a business account — it just doesn't look like it at the start.

Changes:
- When arriving from the business flow, the auth screen opens in **signup** mode (not login) and shows a small business header above the form: "Creá tu cuenta Business" with a one-line subtitle ("Primero creás tu cuenta, después configuramos tu negocio").
- Replace the "Soy empresa" secondary button with a link back to `/business` while in this state, so the entry point isn't duplicated.
- Keep the business intent alive across the email-code verification round trip (already handled by localStorage) and add a short line after signup: "Siguiente paso: configurar tu negocio".
- If a signed-out visitor with business intent instead logs into an existing non-business account, still send them to the Business setup wizard after login.

## 2. "Ver planes en detalle" dumps you on the auth page

Confirmed bug: that button navigates to `/settings/business/plans`, which is a protected route, so signed-out visitors get bounced to `/auth`.

Fix: show pricing without requiring an account.
- Add a public, light-theme plans view reachable from the business onboarding — a read-only comparison of Básico / Profesional / Premium (prices, monthly vs annual with the 5% discount, feature list) plus the events model (6% por entrada, sin mensualidad).
- Its only CTA is "Crear mi cuenta Business", which continues the same intent flow.
- No plan can be selected or purchased from this public view; the real selection/payment stays in `/settings/business/plans` for signed-in businesses.

## Technical notes

- `src/pages/Auth.tsx`: read the business intent (nav state or `localStorage`) to force signup mode, render the business context header, and route post-auth to `/business/setup`.
- `src/pages/BusinessLanding.tsx`: point "Ver planes en detalle" at the new public route instead of `/settings/business/plans`.
- New `src/pages/BusinessPlansPublic.tsx` + public route `/business/planes`, sourcing all copy and prices from the existing `SUBSCRIPTION_TIERS` and fee constants — no new pricing values.
- Extract the tier card presentation used by `BusinessPlans.tsx` into a shared read-only component so both views stay in sync.
- No backend or schema changes.

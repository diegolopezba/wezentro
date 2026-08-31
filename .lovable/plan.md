# "Soy empresa" — business signup from the auth page

Add a dedicated business entry point on the auth screen so venues, restaurants and organizers can create a Business account from the very first screen, instead of discovering it later in Settings.

## The flow

```text
/auth  ──[ Soy empresa ]──►  /business  (3 light-theme intro pages)
                                   │
                                   ▼
                          Crear cuenta (email + password + terms)
                                   │
                                   ▼
                     Perfil básico (usuario, nombre, género, fecha nac.)
                                   │
                                   ▼
                 Business setup wizard (light theme, 3 steps)
                   1. Categoría de negocio
                   2. Información (dirección, horarios, teléfono)
                   3. Datos bancarios (Qhantuy)
                                   │
                                   ▼
              Restaurante / café / bar → Planes    ·   Resto → /settings/business
```

## 1. Auth page button

- Below the main "Iniciar Sesión / Crear Cuenta" button, add a secondary full-width outline button "Soy empresa" with a short helper line ("Creá la cuenta de tu bar, restaurante, club o productora").
- Shown in both login and signup modes; hidden in reset-password and OTP-verification states.
- Tapping it navigates to `/business`.

## 2. Three intro pages (`/business`, public route, light theme)

A single page with a swipeable/animated 3-step carousel (progress dots, spring transitions, swipe + button navigation), styled with the existing `light-sheet` palette so it reads as a bright, Apple-like flow against the dark app.

1. **Tu perfil, el de tu negocio** — profile on the map and in Discover, address/hours/phone, verified as a local.
2. **Herramientas para llenar tu local** — ticketing with QR check-in, guestlists, digital menu, online reservations, experiences, dashboard. Animated feature cards that stagger in.
3. **Cuánto cuesta** — events/tickets: no monthly fee, 6% per ticket; restaurant/café/bar: plan from Bs. 250/month, no per-reservation fee. Link to "Ver planes".

Final CTA: **"Crear mi cuenta Business"**.
- If the visitor is signed out → `/auth` in signup mode, carrying a `businessIntent` flag.
- If already signed in and not a business → straight into the setup wizard.
- If already a business → `/settings/business`.

## 3. Carrying the business intent through signup

- The intent is persisted (navigation state + `localStorage`, same pattern as the referral code) so it survives the email-code verification round trip.
- After signup + OTP, the existing `/onboarding` (username, name, gender, birth date) runs unchanged — it is required for every account.
- On completing onboarding with the business intent set: mark the profile as business and send the user into the business setup wizard instead of the home feed.

## 4. Business setup wizard (`/business/setup`, light theme, authenticated)

Reuses existing logic and screens' data layer, presented as one guided 3-step flow with a progress bar and a "Completar después" escape:

1. **Categoría** — the existing `BUSINESS_TYPES` grid; saves `business_type` + `is_food_business`, with the food/non-food pricing note.
2. **Información** — business name, address (with the existing map picker), hours and phone, saved to the same profile fields `/settings/business/info` uses.
3. **Datos bancarios** — the existing Qhantuy beneficiary form (name, CI, bank, account number, account type) via the same `qhantuy-register-beneficiary` function; skippable, with a clear note that it's required before selling tickets.

On finish: food businesses go to `/settings/business/plans`, everyone else lands on `/settings/business` with the setup checklist reflecting what's already done.

## Technical notes

- New routes in `src/App.tsx`: `/business` (public) and `/business/setup` (protected, `requireProfile`).
- New files: `src/pages/BusinessLanding.tsx`, `src/pages/BusinessSetup.tsx`, plus small step components under `src/components/business/setup/`.
- Extract the bank-details form body from `BusinessPaymentSettings.tsx` into a reusable `BeneficiaryForm` component so the wizard and the settings page share one implementation.
- Business copy/pricing stays sourced from `SUBSCRIPTION_TIERS` and the existing intro-sheet content; no new pricing constants.
- `BusinessIntroSheet` in Settings remains as-is for existing users converting later — no duplicate copy is introduced beyond shared step data.
- No schema changes: everything writes to existing `profiles` fields and `qhantuy_beneficiaries`.

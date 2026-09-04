# Email audit fixes + desktop version (phased)

## Part 1 — Emails

### Signup: send a 6-digit code instead of a confirm button (confirmed cause)

The signup auth email template renders a "Confirmar correo" button from the confirmation URL and never shows a code. The app already has `verifySignupOtp` in the auth context, so only the email and the signup screen need to change.

- Rewrite the signup email to display the 6-digit token prominently (large, spaced digits, expiry note), no CTA button.
- Keep the same brand styling; drop the confirmation link entirely so there is one unambiguous action.
- Make sure the signup screen routes to the code-entry step after sign-up and that "reenviar código" resends the same code email.

### Audit findings on the other triggers (verified against code + delivery logs)

Every app email has a real trigger wired:


| Email                             | Trigger                             | State |
| --------------------------------- | ----------------------------------- | ----- |
| tickets-purchased                 | payment callback + free-ticket path | wired |
| lounge-confirmed                  | payment callback after area booking | wired |
| experience-confirmed / -received  | payment callback + booking hook     | wired |
| reservation-confirmed / -received | reservation create/cancel hook      | wired |
| subscription-activated / -renewal | payment callback + lifecycle cron   | wired |
| special-invite, invite-confirmed  | invite send + RSVP accept           | wired |
| waitlist-released                 | waitlist release function           | wired |


Two real problems the logs show:

1. **Bulk invites were silently dropped.** 17 invitation emails came back `rate_limited` in one batch and were never delivered — the bulk invite sender fires one send per row with no pacing and no retry. Fix: pace the sends inside `send-special-invites`, honour the rate-limit retry delay, and report per-recipient outcomes back to the UI so the business sees who was not reached.
2. **A malformed address bounced** (`...gmail.comj`). Fix: validate/normalise addresses before sending in the invite import and invite send paths.

Also as part of this pass: add explicit error logging where email dispatches are fire-and-forget, so a failed send is visible instead of silent, and register the send functions that are missing from the function config so their auth expectations are explicit.

## Part 2 — Desktop version (Pinterest-style), phased

The mobile experience stays exactly as it is today — desktop layouts activate only at `lg` and above, so the Capacitor app builds are unaffected.

Desktop rules taken from Pinterest: persistent left icon rail instead of the bottom bar, a slim top search/header, a wide fluid masonry grid that adds columns with viewport width, content opening in a centered overlay modal over a dimmed background rather than a full page, and hover affordances allowed on desktop only (mobile keeps the no-hover rule).

### Phase 1 — Desktop shell + consumer pages

- App shell: left nav rail (Home, Buscar, Crear, Entradas, Perfil and Notifications) on `lg+`, bottom nav hidden; top bar with logo, main icon, search, and filter icon.
- Home feed: fluid masonry with 4–6 columns by width, wider max container, desktop hover overlay on cards.
- Discover/Buscar, Perfil, Entradas/Reservas: multi-column layouts and wider containers.
- Event/Experience detail: centered overlay modal with a two-column body (media left, info + purchase CTA right).
- Purchase flow: on desktop the checkout carousel becomes a centered dialog of fixed width instead of a bottom sheet; steps and logic unchanged.
- Sheets/menus: bottom sheets become centered dialogs or side panels on desktop.

### Phase 2 — Business desktop (separate pass, after review)

- Gestión: persistent left section nav, event pill row becomes a sidebar list, detail panel to its right.
- Reservas / Experiencias: day picker plus timeline side by side instead of stacked.
- Dashboard: multi-column metric grid, wider charts, funnel and pace side by side.

## Technical notes

- New `useIsDesktop` breakpoint hook plus a `DesktopShell` layout wrapper; pages keep their current mobile markup and gain `lg:` variants.
- A shared `ResponsiveSheet` wrapper renders the existing bottom sheet on mobile and a centered dialog on desktop, so each sheet is adapted once.
- Hover styles are gated behind a desktop-only utility so the app-wide no-hover rule still holds on touch.
- No database or payment logic changes in either part.
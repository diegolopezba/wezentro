# Fix signup → can't log in (email confirmation flow)

## Root cause

Signup actually succeeded (logs show a fresh user `6803ae33-…` created, `identities` length 1, `confirmation_sent_at` set). Because email confirmation is enabled, Supabase returned the user with **no session**. Our code still showed "¡Cuenta creada!" and pushed to `/onboarding`. `ProtectedRoute` saw no user and bounced back to `/auth`, so it looked like nothing happened. The user then tried to log in and got "Invalid login credentials" (the account isn't confirmed yet, plus there was a password typo on retry).

## Change

Single edit in `src/pages/Auth.tsx`, signup branch of `handleAuth` (right after the existing duplicate-email check):

- If `data.user` exists but `data.session` is `null` → confirmation email was sent.
  - Show a clear success toast: "Te enviamos un correo de verificación a {email}. Confírmalo para iniciar sesión." (duration 8s)
  - `setMode("login")`, clear the password, keep email pre-filled.
  - Do **not** navigate to `/onboarding`.
- If `data.session` exists (auto-confirm on, future-proof) → keep current behavior and navigate to `/onboarding`.

Keep the existing duplicate-email and `"already registered"` checks unchanged.

## Out of scope

- AuthContext, ProtectedRoute, Onboarding — no changes.
- No auth config change (email confirmation stays ON as requested).
- No edge functions or DB changes.

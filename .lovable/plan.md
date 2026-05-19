## Problem

The logs confirm what happened: Supabase received `user_repeated_signup` on `/signup` (status 200, no error). To prevent email enumeration attacks, Supabase **does not return an error** when an existing email signs up again — it returns success with a fake/obfuscated user object whose `identities` array is empty.

Our current code in `src/pages/Auth.tsx` (line 122) only checks `error.message`. Since there is no error, we show "¡Cuenta creada!" and push the user to `/onboarding`. But no real session exists, so when they try to log in with the password they just typed, it fails — because that password was never saved (the original account keeps its old password).

This is a common, confusing failure mode and worth fixing properly.

## Fix

**1. `src/contexts/AuthContext.tsx` — `signUp`**
- Return the full `{ data, error }` from `supabase.auth.signUp` (not just `error`), so the caller can inspect `data.user.identities`.
- Update the `AuthContextType` signature accordingly.

**2. `src/pages/Auth.tsx` — `handleAuth` signup branch**
- After signUp, detect duplicate email:
  - `data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0` → email already exists.
- When detected:
  - Show toast: `"Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña."`
  - Switch the form to login mode (`setMode("login")`), keep the email pre-filled, clear the password field.
  - Do NOT navigate to `/onboarding`.
- Also auto-detect "session is null but no user identities" as the same case (defensive).
- Keep the existing `"already registered"` error-string check as a fallback for older SDKs.

**3. No DB / RLS / edge function changes needed.** This is purely a client-side detection fix.

## Out of scope
- No change to email confirmation flow.
- No change to onboarding logic.
- Not touching the menu icon work from earlier turns.
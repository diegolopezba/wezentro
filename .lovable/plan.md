## What I verified

- Signup routes to `/onboarding` (`src/pages/Auth.tsx`), a 4-step form (`src/pages/Onboarding.tsx`). Step 1 "Continuar" validates the username, checks availability in `profiles`, then advances to step 2.
- `rafael2510_` passes every client validation rule (11 chars, only letters/digits/underscore) and **is not taken** — a query of `profiles` returns no row matching `%rafael%`. So this is not a "username in use" case; the availability check should succeed.
- The newest account in the database is still `user_cbd50d1c` with no name/gender/birth date — it got created but never finished onboarding, matching the report. Two older accounts are stuck the same way.
- "Algo salió mal" is the global `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) — a thrown JavaScript exception, not a handled API error.

The exact throwing line is **not yet confirmed** (no console/session data from that user), so the plan starts by capturing it rather than guessing.

## Plan

**1. Reproduce and capture the real error**
- Create a throwaway account in a headless browser against the running app and walk signup → username → continue, watching console and network to see whether it reproduces with `rafael2510_`.
- Add error detail to the boundary screen (short technical message + a "copy details" affordance) so any future occurrence is diagnosable from a screenshot.
- Add targeted logging around the onboarding step transition: username value, availability query result/error, and any thrown exception.

**2. Harden the fragile spots already found in the code**
- `ProtectedRoute` calls `profile.username.startsWith("user_")` unguarded — a null username there throws and renders the error page. Make it null-safe.
- Wrap the onboarding step handler in try/catch so an unexpected failure shows an inline Spanish message and keeps the user on the form instead of tearing down the app.
- Give `/onboarding` its own error boundary with a "Reintentar" button so a crash there never wipes the whole app tree.
- Make the availability check distinguish "query failed" from "name taken", so a transient/RLS error no longer silently reads as "Este usuario ya está en uso".

**3. Rule out a stale cached build**
- The app is an installed PWA; a cached HTML referencing deleted JS chunks makes a lazy import throw and lands on the same error screen. Verify the service-worker navigation strategy and the lazy-import retry path still force a fresh reload on chunk failure.

**4. Verify**
- Run the full flow end to end (signup → username → name → gender/birth date → goal) and confirm a complete profile row lands in the database, then clean up the test account.

## Note

If the reproduction surfaces a different specific bug than the ones above, I'll fix that directly in the same pass and tell you exactly what it was.

It would also help to know the affected user's device/browser (iOS Safari, Android Chrome, installed PWA vs. normal tab) and whether the error page appears instantly or after a spinner.

## What I verified

- The function now reports the exact branch: it returned `session_expired`, which only happens when `auth.getUser()` fails on the token that reached the function.
- The client key in `.env` is a legacy anon JWT, so when the browser has no valid session `supabase.functions.invoke` still sends the anon JWT as `Authorization`. The function then calls `getUser()` on that token and fails — indistinguishable from a real logout.
- The buy button is gated on `user` from `AuthContext` (`handleBuyTicket` → `promptAuth` when guest), so the sheet only opens when a session object exists in memory. Combined with the above, the likely cause is a **stale/expired access token that was never refreshed** in that browser (your screenshot is Safari opened from WhatsApp, not the installed PWA — a resumed/bfcached tab where `autoRefreshToken` hasn't fired), not a truly signed-out user.

## Plan

1. **Refresh the token right before checkout** (`src/components/events/PaymentQRModal.tsx`)
   - In `generateQR` (and the free-join path), call `supabase.auth.getSession()`; if it's missing or `expires_at` is within ~60s, call `supabase.auth.refreshSession()` first.
   - If the refresh succeeds, proceed with `functions.invoke` as normal — this removes the common failure entirely.
   - If the refresh fails, skip the function call and go straight to a clear "sign in again" state.

2. **Give the error step a real recovery action**
   - Capture the server's `code` (not just the message) from `error.context.json()`.
   - When the code is `session_expired` / `no_auth_header` (or the local refresh failed), replace "Reintentar" with **"Iniciar sesión"** which routes to `/auth` with a return path back to this event (preserving the `?p=` promoter param), plus a secondary "Cancelar".
   - All other codes keep the current "Reintentar" behaviour and message.

3. **Keep the session alive when the app is resumed**
   - On `visibilitychange` / `pageshow` (bfcache restore), trigger a `supabase.auth.getSession()` refresh check so a backgrounded Safari tab re-validates before any action, not just checkout.

4. **Re-test**
   - Open the promoter link in Safari while signed in, background the tab for a while, return, and run Comprar → Pagar con QR. Expect a QR instead of the session error; if it still fails, the function logs will now name a different branch.

## Technical notes

- No backend/schema changes; the edge function already returns stable codes (`session_expired`, `no_beneficiary`, `tier_sold_out`, …).
- Files touched: `src/components/events/PaymentQRModal.tsx`, plus a small session-revalidation effect in `src/contexts/AuthContext.tsx`.

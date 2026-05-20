## Add `/reset-password` page

**Problem:** The reset email redirects users to the homepage with a recovery token, but there's no page to actually set a new password.

### Changes

**1. New page** `src/pages/ResetPassword.tsx`
- Standalone public route (no auth required).
- On mount, Supabase auto-exchanges the recovery token in the URL hash → user becomes temporarily authenticated for password update.
- Listen via `supabase.auth.onAuthStateChange` for `PASSWORD_RECOVERY` event to confirm we're in recovery flow; if no session and no recovery event after mount, show "Enlace inválido o expirado" with a button back to `/auth`.
- Form: new password + confirm password. Validate min 6 chars and matching.
- On submit: `supabase.auth.updateUser({ password })` → toast success → sign out → navigate to `/auth` with mode=login so user logs in with new password.
- Brand styling (dark, red CTA, rounded-full button, Poppins).

**2. `src/contexts/AuthContext.tsx`**
- Change `resetPassword` `redirectUrl` from `/auth` to `${window.location.origin}/reset-password`.

**3. `src/App.tsx`**
- Add `<Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />` near the `/auth` route (public, before protected routes).
- Lazy-import `ResetPassword` like the other lazy pages.

### Out of scope
- Email template changes (Lovable default emails work fine — they include the `{{ .ConfirmationURL }}` redirecting to our `redirectTo`).
- Any auth method changes.

### Verification
1. On `/auth`, request recovery email for `gerdilopez@gmail.com`.
2. Click link → lands on `/reset-password` with hash containing `type=recovery`.
3. Enter new password twice → success toast → redirected to `/auth` → log in with new password.

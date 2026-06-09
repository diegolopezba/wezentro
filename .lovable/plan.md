## Goal
Make account creation safe for the launch surge so new users can sign up, confirm email, finish onboarding, and enter the app without hitting the generic “Algo salió mal” page.

## Current findings
- Backend health is good: database is up, no restarts, 40% memory used, disk is low, connection usage is moderate but acceptable.
- Email sender domain `hello.zentro.today` is verified and ready to send.
- Recent auth failures are mostly email-related:
  - `429 email rate limit exceeded` during signup confirmation sends.
  - `400 Email not confirmed` when users try logging in before confirming.
  - Some `422` signup responses.
- App-side issue found: `src/contexts/AuthContext.tsx` has `resendConfirmation` accidentally declared inside `resetPassword`, but still exported in the provider value. That can trigger the generic “Algo salió mal” page because the provider references a variable that is out of scope.
- Onboarding currently blocks users under 18, while project rules say the app is 13+.
- Profile creation trigger exists and creates `profiles` + default user role automatically when the auth user is created.
- Profile username is initially auto-generated as `user_xxxxxxxx`, then onboarding replaces it.

## Plan

### 1. Fix the auth provider crash
- Move `resendConfirmation` out of `resetPassword` so it exists at provider scope.
- Keep reset-password behavior unchanged.
- This directly reduces risk of the generic “Algo salió mal” page during auth flows.

### 2. Harden signup/login error handling
Update the auth page so users see clear Spanish guidance instead of raw backend errors:
- Signup `429` / `over_email_send_rate_limit`: tell them the verification email was already sent and to wait before trying again.
- Login `email_not_confirmed`: tell them to confirm their email and show a resend-confirmation action.
- Signup duplicate / `user_already_exists` / `422`: guide them to log in or recover password.
- Keep successful signup on the login screen with clear “check your inbox/spam” messaging.

### 3. Add resend confirmation UX with cooldown
- Add a “Reenviar correo” action when email confirmation is needed.
- Disable resend for 60 seconds after use to avoid repeatedly hitting email limits.
- Show friendly success/failure toasts.

### 4. Align onboarding with the 13+ requirement
- Change onboarding age gate from 18+ to 13+.
- Update the message to “Debes tener al menos 13 años para usar Zentro.”

### 5. Make onboarding completion safer
- Handle profile update failures with clearer messages for username conflicts or temporary backend issues.
- Prevent duplicate submit taps while the profile is being saved.
- Keep users on onboarding if profile completion fails, instead of navigating away.

### 6. Operational launch checks
After implementation:
- Re-check recent auth logs for `/signup`, `/token`, and `/verify` failures.
- Re-check email send status for the last 24 hours.
- Re-check backend health.
- If 429s continue despite the verified email domain, raise the auth email rate limit in Cloud auth settings rather than disabling email confirmation.

## What this does not change
- It does not auto-confirm signups.
- It does not remove email verification.
- It does not change the database schema unless a new issue appears during validation.
- It does not add any paywall, self-join guestlist flow, or mock data.
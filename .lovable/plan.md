## What I found

Zoe's account is currently marked as confirmed, but the logs show why this felt wrong:

- The confirmation email was accepted by the email system at `17:53:17`.
- Her account was confirmed at `17:53:25` through a `/verify` request.
- That `/verify` request came from a different IP address than her signup/login activity.

That pattern is consistent with a university/security email scanner opening the confirmation link automatically. The backend treats any valid visit to the confirmation link as confirmation, so the scanner can confirm the account before the human sees the email.

## Goal

Make signup confirmation require a real user action, not just an automated scanner opening a link.

## Plan

1. **Switch signup emails to an OTP-style confirmation flow**
   - Update the signup email so it shows a short verification code instead of relying only on a one-click confirmation link.
   - This prevents link scanners from completing signup just by visiting a URL.

2. **Add a verification-code screen after signup**
   - After the user creates an account, show a screen asking for the confirmation code sent to their email.
   - The user enters the code in the app to finish confirmation.
   - Include a resend button with the existing cooldown/error handling.

3. **Confirm signup with the code, not scanner clicks**
   - Use the auth provider's email OTP verification method for `signup`.
   - On success, continue the normal logged-in/onboarding flow.
   - On failure, show a clear Spanish error message.

4. **Keep login blocked for unconfirmed users**
   - Preserve the current backend enforcement: email/password login must still fail until the account is confirmed.
   - Improve the UI message for `Email not confirmed` so users know to enter or resend the code.

5. **Verify the fix**
   - Check the signup email log for a fresh test account.
   - Confirm that merely opening/scanning the email link does not complete login.
   - Confirm that entering the code does complete signup.

## Technical details

- The root problem is not that email confirmation is disabled. It is enabled.
- The weak point is one-click confirmation links: automated security software can consume them.
- The fix is to move the user-facing signup path to manual code verification using the existing auth email system.
- No database schema change should be needed.
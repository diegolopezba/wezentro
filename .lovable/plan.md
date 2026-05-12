## Goal
Treat date of birth and gender as required profile data instead of optional.

## Changes

### 1. `src/pages/Onboarding.tsx` (step 3)
- DOB is already required (18+ check).
- Add a required check for `gender`: if empty, show a toast ("Selecciona tu género") and block completion.
- Disable the "¡Vamos!" button until both `gender` is selected and the three birth date fields are filled.

### 2. `src/pages/EditProfile.tsx`
- Change the "Información Personal" section heading: remove the "(opcional)" chip, add a red asterisk to "Fecha de nacimiento *" and "Género *".
- Update the info note copy to clarify the data is required (still private).
- In `handleSave`, validate before submitting:
  - Gender must be one of the allowed values.
  - DOB must parse to a valid date and the user must be 18+ (consistent with onboarding/store compliance).
  - On failure, toast a clear Spanish message and abort the save.
- Remove the "fall back to null" behavior so an empty/invalid DOB or gender can no longer be saved.

### 3. `src/components/auth/ProtectedRoute.tsx` (gentle enforcement for legacy accounts)
- Extend the existing profile-completeness check: if `profile` exists but `birth_date` or `gender` is missing, redirect to `/edit-profile` (with a one-time toast shown there) instead of letting them through.
- Allow `/edit-profile`, `/settings`, `/auth`, and `/onboarding` themselves to render without the redirect to avoid loops.
- Existing "Complete your profile" banner on the Profile page stays as a soft prompt for users who somehow bypass it.

## Out of scope
- No DB schema changes. The columns stay nullable (legacy rows already have nulls); enforcement is at the app layer, matching how other "required" profile fields work today.
- No changes to business-only fields, bio, avatar, or username flows.
- No backfill of existing users — they'll be prompted on next navigation.

## Notes
- Spanish copy stays consistent with the rest of the app.
- Privacy note remains: "Tu género y edad nunca se muestran públicamente."

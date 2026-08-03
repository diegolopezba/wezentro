# Remove the "Meta del año" (experience goals) feature

The yearly experience-goal feature is confusing users and adds an extra step during signup. It gets removed completely from the app.

## What changes for users

- Signup gets shorter: the final "meta del año" step disappears, so onboarding ends right after gender/birth date.
- The profile header no longer shows the small progress ring.
- The "Meta del año" row disappears from Settings > Personal.
- No goal card, sheet, or progress tracking anywhere.

## Technical scope

Delete these files:
- `src/components/profile/ExperienceGoalCard.tsx`
- `src/components/profile/ExperienceGoalSheet.tsx`
- `src/components/profile/ExperienceGoalPicker.tsx`
- `src/components/profile/ExperienceStatRing.tsx`
- `src/hooks/useExperienceProgress.ts`

Edit:
- `src/pages/Onboarding.tsx` — remove step 4 and its picker, the `experienceGoal` form state, the `skipGoal` option, and the `experience_goal` / `experience_goal_year` writes; make step 3's "Continuar" complete onboarding directly.
- `src/pages/Profile.tsx` — remove the ring button in the header, `goalSheetOpen` state, the sheet mount, and the progress hook/derived values.
- `src/pages/Settings.tsx` — remove the "Meta del año" item, the `__experience_goal__` branch, the sheet mount, and the now-unused `Sparkles` import.

Database: leave the `profiles.experience_goal` and `experience_goal_year` columns in place (unused, harmless). Say the word if you want them dropped too.

Verify with a TypeScript check that no stale imports remain.

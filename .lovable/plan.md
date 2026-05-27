## Compact Experience Goal ring in profile stats

Replace the large `ExperienceGoalCard` below the bio with a small inline ring that lives inside the existing stats row, replacing the "Eventos" stat.

### Changes

**`src/pages/Profile.tsx`**
- Remove `<ExperienceGoalCard />` from below the banner.
- Remove the `ExperienceGoalCard` import.
- Import `useExperienceProgress` and a new tiny `ExperienceStatRing` component.
- Replace the first stat (`Eventos`) with conditional rendering:
  - **Goal set for current year** → render `ExperienceStatRing` (small ~36px ring with % inside), label `"Exp"`, tap opens `ExperienceGoalSheet`.
  - **No goal / stale year** → render the normal events count (current behavior), label stays `"Eventos"`. No extra indicator.
- Keep `Seguidores` and `Siguiendo` stats unchanged.

**New `src/components/profile/ExperienceStatRing.tsx`**
- Small SVG ring (size ~36, stroke 3).
- Shows `{percent}%` centered in `font-brand text-base font-bold`.
- Brand red stroke when `ahead | on_track | complete`, muted otherwise.
- Receives `percent` and `pace` props; pure presentational.

**No changes** to `useExperienceProgress`, `ExperienceGoalSheet`, `ExperienceGoalPicker`, onboarding, settings, or DB.

### UX detail

The ring sits where the "Eventos" number used to, same vertical rhythm as the other two stats. Tapping the ring/label area opens the existing bottom sheet (same as before). When the user hasn't set a goal yet, the row looks exactly like it does today — discovery of the feature happens via Onboarding step 4 and Settings → Meta del año.

# Plan: Replace stats-row ring with plain text, add ring inside bottom sheet

## Changes

### 1. `src/pages/Profile.tsx`
- Remove `ExperienceStatRing` import.
- In `eventsStat`, replace `node: <ExperienceStatRing .../>` with plain `value: \`${experienceProgress.percent}%\``.
- Keep `label: "Exp"`, `onClick`, and `ExperienceGoalSheet` unchanged.
- Fallback to `Eventos` count when no active goal — unchanged.

### 2. `src/components/profile/ExperienceGoalSheet.tsx`
- Import `ExperienceStatRing`.
- In the read-only view (`!editMode && data && data.goal`), replace the big `{count} / {goal}` number block with a centered `ExperienceStatRing` (size ~140, stroke ~8) showing `percent`, with the `{count} / {goal}` text and pace line below it.

### 3. `src/components/profile/ExperienceStatRing.tsx`
- Make stroke scale with size (e.g. `stroke = Math.max(3, Math.round(size / 14))`) so it looks good both at 36px (not used anymore but kept available) and at 140px in the sheet.
- Scale the inner percent text size based on `size` (e.g. `size >= 80 ? "text-2xl" : "text-[11px]"`).

## Result
Stats row shows clean text `25%` / `Exp` matching `Seguidores` / `Siguiendo` style. Tap still opens the bottom sheet, which now features a prominent circular progress ring at the top.

# Plan: Simplify stats row, keep ring inside bottom sheet

## 1. `src/pages/Profile.tsx`
- Remove `ExperienceStatRing` import.
- In `eventsStat`, replace the `node: <ExperienceStatRing .../>` with plain `value: \`${experienceProgress.percent}%\``.
- Keep `label: "Exp"`, `onClick: () => setGoalSheetOpen(true)`, and `ExperienceGoalSheet` unchanged.
- Fallback to `Eventos` count when no active goal — unchanged.

## 2. `src/components/profile/ExperienceGoalSheet.tsx`
- Import `ExperienceStatRing`.
- In the read-only view (`!editMode && data && data.goal`), replace the big `{count} / {goal}` number block with a centered `ExperienceStatRing` (size ~140) showing `percent`, with the `{count} / {goal}` and pace line below it.

## 3. `src/components/profile/ExperienceStatRing.tsx`
- Scale stroke with size (`stroke = Math.max(3, Math.round(size / 14))`) so it looks right at 140px.
- Scale inner percent text based on size (e.g. `size >= 80 ? "text-2xl" : "text-[11px]"`).

## Result
Stats row reads cleanly: `25%` / `Exp`, matching `Seguidores` and `Siguiendo`. Tap still opens the bottom sheet, which now features a prominent ring at the top.

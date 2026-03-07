
## Plan: Replace interests step with age & gender in Onboarding

### What's changing
Step 3 of onboarding currently shows a list of interest chips to select. We'll replace it with age (birth date) and gender selection — the same demographic fields that already exist in the `profiles` table (`birth_date` and `gender`).

The interests selection is removed entirely from onboarding (users can still set interests later via Edit Profile if needed, but the field isn't used for anything critical right now — the demographic data is actually more valuable for the ad targeting system).

### Step 3 new UI
- **Gender**: 4 pill/chip buttons to tap (Masculino, Femenino, No binario, Prefiero no decir) — same options as EditProfile
- **Age**: 3 separate inputs for Day / Month / Year (same pattern as EditProfile), or a simpler birth year-only input to keep it light

### Changes

**`src/pages/Onboarding.tsx`**
1. Remove the `interests` array and `handleInterestToggle` function
2. Add `gender` and `birth_day`, `birth_month`, `birth_year` fields to `formData`
3. Replace step 3 JSX (interest chips) with gender pill selector + birth date inputs
4. Update `handleComplete` to save `birth_date` and `gender` instead of `interests`
5. Update step 3 heading/subtitle to "Cuéntanos un poco más" / "Esta info es privada y nos ayuda a personalizar tu experiencia"
6. Keep the "Omitir por ahora" skip button so it remains optional

### No DB changes needed
`birth_date` (DATE) and `gender` (TEXT) columns already exist on the `profiles` table from a previous migration. No new migration required.

### Visual approach
Gender: horizontal row of 2×2 pill buttons (same `gradient-red` selected style as the old interests)
Birth date: 3 small side-by-side inputs labeled DD / MM / AAAA, with basic validation (valid date check before saving)

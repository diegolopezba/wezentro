Fix "Seguir de vuelta" text overflowing follow buttons.

**Files to change:**

1. `src/components/profile/FollowersSheet.tsx` (FollowButton component)
   - Change `min-w-[80px]` to `min-w-[100px]` to accommodate "Seguir de vuelta"
   - Remove the `<UserPlus>` icon since the app doesn't use it on follow buttons
   - Add `truncate` class to the button text
   - Add `px-2` to reduce horizontal padding and give the label more room

2. `src/pages/UserProfile.tsx` (profile follow button)
   - Add `truncate` class to the button text as a safeguard on narrow screens

**Why:** "Seguir de vuelta" is ~95px wide at `text-xs` inside an 80px button, causing visual overflow. Widening to 100px and truncating the text resolves it cleanly while keeping the contextual meaning.
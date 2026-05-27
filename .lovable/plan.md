
# Experience Goal — Yearly Gamification

A private, personal yearly tracker. Users set a goal at signup ("how many new experiences this year?"), and their own profile shows a progress ring computed from real actions.

## Concept

- **Visible only to the owner** of the profile. Never shown publicly. No leaderboards, no pressure.
- **One number = one experience.** Deduped so the same event/business on the same day counts once.
- **Calendar year (Jan 1 – Dec 31)** with **prorated suggestion** for late signups (e.g. someone joining Oct 1 gets a suggested goal scaled to remaining days, but they can pick anything).
- Goal can be edited anytime from Settings. Year resets every Jan 1 (new goal prompt appears).

## What counts toward progress

Three sources, all already in the database — no new tracking infra:

1. **Verified event check-ins** — `guestlist_entries.checked_in_at IS NOT NULL` for the current user, where the event's `start_datetime` falls within the active year. Dedupe by `event_id`.
2. **Past confirmed reservations** — `reservations` where `user_id = me`, `status = 'confirmed'`, and `reservation_date <= today`, within the active year. Dedupe by `(business_id, reservation_date)`.
3. **Posts and events created by the user** — `events` where `creator_id = me`, `deleted_at IS NULL`, `created_at` within the active year. Counts both `is_post = true` and `is_post = false`.

Guestlist joins WITHOUT a check-in do **not** count (avoids inflation).

## Goal selection UX

- **Visual slider 1–365** with live label ("25 experiencias"). Quick chips above the slider: `10 · 25 · 50 · 100` for one-tap selection.
- For users signing up after Mar 1, show a small hint: *"Te quedan X días este año — sugerimos ~Y experiencias"* (Y = round(X / 365 × 50)). Just a hint, they pick freely.
- "Saltar por ahora" link — defers prompt until they open their profile (banner there: "Define tu meta del año").

## Where it appears

### 1. Onboarding (new step 4)

Add a 4th step to `src/pages/Onboarding.tsx` after the gender/birth step. Progress bar becomes `step/4`. Headline: *"Una última cosa"* + subtitle: *"¿Cuántas experiencias nuevas quieres vivir este año?"*. Slider + chips + skip link.

### 2. Own Profile (`/profile`)

A new compact card near the top of `src/pages/Profile.tsx` (above or alongside the existing stats row):

- Circular progress ring (SVG, brand red gradient when on-pace, muted when behind).
- Center number: `42 / 100`.
- Below: `42% • vas adelantado` (or *en ritmo* / *vas atrasado* based on calendar pace vs goal pace).
- Tiny breakdown row: `🎟 23 eventos · 📍 14 lugares · ✍️ 5 posts`.
- Tap → opens a bottom sheet with month-by-month breakdown and an "Editar meta" button.

Hidden entirely on the public profile (`/user/{userId}`) — owner-only.

### 3. Settings

New row: *"Meta del año"* → opens the same edit sheet (slider + chips).

## Data model

Minimal — two columns on `profiles`:

- `experience_goal` (int, nullable) — the target number.
- `experience_goal_year` (int, nullable) — the year the goal applies to. When it doesn't match `EXTRACT(YEAR FROM now())`, we show a "set new goal for {year}" prompt and treat progress as 0 against the old goal until they confirm.

No new tables for v1. Progress is computed live in a single hook (`useExperienceProgress`) with three parallel Supabase queries, cached by react-query for 60s.

Future (not in this plan): a `yearly_recap` materialized snapshot in December for the year-in-review feature.

## Files to add / change

**New:**
- `src/hooks/useExperienceProgress.ts` — fetches counts, dedupes, returns `{ count, goal, percent, pace, breakdown }`.
- `src/components/profile/ExperienceGoalCard.tsx` — the ring + breakdown card.
- `src/components/profile/ExperienceGoalSheet.tsx` — bottom sheet with monthly breakdown and edit button.
- `src/components/profile/ExperienceGoalPicker.tsx` — reusable slider+chips (used in onboarding, settings, edit sheet).

**Edited:**
- `src/pages/Onboarding.tsx` — add step 4, update progress bar to `/4`, save `experience_goal` + `experience_goal_year` on completion.
- `src/pages/Profile.tsx` — mount `ExperienceGoalCard` (only when viewing own profile).
- `src/pages/Settings.tsx` — add "Meta del año" row.

**Migration:**
- Add `experience_goal int` and `experience_goal_year int` to `profiles`. No RLS changes needed (profile is already viewable; we just don't render the progress publicly on the client).

## Edge cases handled

- User skips goal → no card shown, instead a subtle "Define tu meta del año" banner on their profile.
- User hits 100% → ring stays full, label changes to *"¡Meta cumplida! 🎉"* and starts showing `42 / 25 (+17 bonus)`.
- New year rollover → if `experience_goal_year < current year`, show prompt to set a new goal; progress card grays out until they do.
- Deleted events/cancelled reservations are excluded by the queries (`deleted_at IS NULL`, `status = 'confirmed'`).

## Honest tradeoffs

- **Live computation** is simple and always accurate but adds 3 small queries per profile visit. With react-query caching (60s) and small result sets (count-only queries), the cost is negligible. If usage grows, we can move to a nightly snapshot table.
- **Dedupe by day** for reservations means going to the same café twice in one day = 1. This is the right call for "new experiences" framing but worth confirming.
- **No public visibility** is intentional and matches existing privacy posture. Sharing a year-in-review card publicly is a future opt-in feature, not v1.

## Out of scope for this plan

Badges, milestones, social sharing of progress, year-in-review recap, push notifications when goal is hit. All viable follow-ups once the foundation works.

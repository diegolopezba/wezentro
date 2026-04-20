
# Plan: Harden Sponsored Post System (Gaps 4–7, 9)

Skipping Gap 3 (server-side impression dedup) per user request. Implementing the rest.

---

## Gap 4 — Fix click tracking + dedup

**Backend:**
- New table `sponsored_clicks(id, sponsored_post_id, viewer_id nullable, viewer_fingerprint text, day date generated, created_at)` with unique index on `(sponsored_post_id, viewer_id, day)` and `(sponsored_post_id, viewer_fingerprint, day)`.
- Rewrite `increment_sponsored_clicks(_post_id, _viewer_id, _fingerprint)`:
  - Insert into `sponsored_clicks`. On conflict → return early.
  - Otherwise bump `clicks` on `sponsored_posts`.

**Frontend:**
- `EventCard.tsx`: when `isSponsored && sponsoredPostId` and the card is tapped → call `trackSponsoredClick.mutate({ postId, viewerId, fingerprint })`. Use a ref-based `Set` so re-renders don't double-fire.
- `useSponsoredPosts.ts`: update `useTrackSponsoredClick` signature to pass viewer + fingerprint (localStorage UUID for guests).

---

## Gap 5 — Enforce `daily_budget`

Extend `increment_sponsored_impressions` (still bumps in-place since Gap 3 is skipped):
- After bumping `spent`, compute today's spend from `sponsored_posts.impressions` daily delta — since we don't have per-impression rows, use a new lightweight counter table `sponsored_daily_spend(post_id, day, spent)` with upsert on each impression. Cheap, single row per post per day.
- If `daily_budget IS NOT NULL` AND today's `spent >= daily_budget` → set status to `paused_daily`.
- Allowed status values now include `paused_daily` (alongside existing `draft`, `active`, `paused`, `completed`).

---

## Gap 6 — `end_date` scheduling + lifecycle cron

**New edge function** `sponsored-posts-lifecycle` (`verify_jwt = false`):
- Set `status = 'completed'` where `status IN ('active','paused_daily')` AND `end_date < now()`.
- Set `status = 'active'` where `status = 'scheduled'` AND `start_date <= now()` AND (`end_date IS NULL` OR `end_date > now()`).
- Reactivate `paused_daily` campaigns where today's `sponsored_daily_spend.spent < daily_budget` (handles UTC day rollover).

**Cron:** Enable `pg_cron` + `pg_net`, schedule the function every 15 minutes via the insert tool (so user-specific URL/anon key isn't migrated).

Also adds `'scheduled'` as a valid status so advertisers can future-date campaigns (UI hookup out of scope — just supports it in the model).

---

## Gap 7 — Smarter targeting (server-side eligibility + engagement ranking)

**New RPC** `get_eligible_sponsored_posts(_user_id uuid, _lat float, _lng float)`:
- Selects active sponsored posts joined with their event.
- Filters server-side by: `target_gender`, `target_age_min/max` (computed from viewer's `birth_date`), `target_radius_km` (Haversine vs event lat/lng), `target_categories` (intersect viewer's `interests`).
- Orders by viewer's `user_category_preferences.score` for the ad's category DESC, then random for ties / new users.
- Returns same shape currently consumed by `useActiveSponsoredPosts`.

**Frontend:**
- `useSponsoredPosts.ts`: `useActiveSponsoredPosts` calls the new RPC (passing user id + location). Falls back to current query for guests.
- `Index.tsx`: remove `filterSponsoredByTargeting` and the `userDemographics` query — eligibility now happens server-side. Keep the index-1 + every-9 injection logic.

---

## Gap 9 — Daily spend visibility in dashboard

- `SponsoredSummaryBar.tsx` (or campaign row in `BusinessDashboard`): for each campaign show `Hoy: Bs. X / Bs. Y` (today's spend vs daily cap) when `daily_budget` is set.
- Source: query `sponsored_daily_spend` for the current UTC day per campaign.
- Add a small "Pausado por presupuesto diario" badge when `status = 'paused_daily'`.

---

## Files to create / modify

**New migration:**
- Create `sponsored_clicks` + `sponsored_daily_spend` tables with indexes
- Rewrite `increment_sponsored_impressions` (daily spend + paused_daily logic)
- Rewrite `increment_sponsored_clicks` (dedup + counter bump)
- Create `get_eligible_sponsored_posts` RPC
- Enable `pg_cron`, `pg_net`

**Cron schedule (via insert tool, not migration):**
- Schedule `sponsored-posts-lifecycle` every 15 min

**New edge function:**
- `supabase/functions/sponsored-posts-lifecycle/index.ts`

**Frontend:**
- `src/hooks/useSponsoredPosts.ts` — new RPC for eligibility, updated click tracking signature, expose `useTodayDailySpend`
- `src/components/events/EventCard.tsx` — wire click tracking on sponsored taps
- `src/pages/Index.tsx` — remove client-side targeting filter and demographics query
- `src/components/dashboard/SponsoredSummaryBar.tsx` (and/or campaign rows in `BusinessDashboard.tsx`) — show today's spend vs daily cap, paused_daily badge

**Out of scope:**
- No pricing changes ($5 CPM stays)
- No advertiser UI changes for targeting form
- Gap 3 (impression dedup) — explicitly skipped

---

## Risks / mitigations

- **RPC signature changes** → publish new function names alongside old (`increment_sponsored_clicks_v2`), migrate clients atomically, drop old after deploy verified.
- **Guest fingerprinting for click dedup** = best-effort (localStorage UUID) — clears on cache wipe. Acceptable for click integrity.
- **Cron at 15 min** keeps DB load low; daily-budget pause is real-time inside the impression RPC so no over-spend window.
- **`sponsored_daily_spend` row growth** = 1 row per campaign per day → trivial.

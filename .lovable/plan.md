# Fan base section (Audiencia tab)

Replace "Seguidores recientes" with a "Fan base" section: the top 10 people who interact most with the business, shown as a profile list with a score/badge, in the same visual style as the current follower list.

## What counts as interaction

One weighted score per user, across all of the business's content:

| Signal | Source | Weight |
| --- | --- | --- |
| Check-in at an event | guestlist_entries (checked_in_at not null) | 5 |
| Ticket / guestlist entry | guestlist_entries | 3 |
| Lounge booking | area_bookings (confirmed) | 5 |
| Experience booking | experience_bookings (confirmed) | 5 |
| Table reservation | reservations (confirmed) | 4 |
| Comment | event_comments | 2 |
| Like | event_likes | 1 |
| Follow | follows | 1 |

Weights are constants in one place so they are easy to tune later.

## UI

In `AudienceTab.tsx`, the `AudienceInsights` (Seguidores recientes) block is replaced by a new `FanBaseSection`:

- Header "Fan base" with a short subtitle ("Tus 10 personas más activas").
- Ranked rows: position, avatar, full name, username, and a right-side score plus a compact breakdown line (e.g. "3 eventos · 1 lounge · 12 likes").
- Top 3 get a subtle highlight consistent with the existing repeat-attendees card style.
- Tapping a row opens `/user/{userId}`.
- Empty state: "Aún no hay suficiente actividad para calcular tu fan base."
- Loading skeleton matching the current list.

Mobile layout unchanged in structure; on desktop the list uses the wider dashboard grid already in place.

## Technical

- New DB function `get_business_fan_base(_business_id uuid, _limit int default 10)`, `security definer`, `stable`, `set search_path = public`, returning `user_id, full_name, username, avatar_url, score, events_attended, lounges, experiences, reservations, comments, likes`. It unions the per-signal counts scoped to the business's events (`events.creator_id = _business_id`, `deleted_at is null`) and to `reservations.business_id` / experiences owned by the business, groups by user, orders by score desc, limits to `_limit`. Excludes the business's own user id.
- `grant execute on function public.get_business_fan_base(uuid, int) to authenticated;`
- New hook `useFanBase()` in `src/hooks/useBusinessAnalytics.ts` calling the RPC with the authenticated user id.
- New component `src/components/dashboard/FanBaseSection.tsx`; `AudienceInsights.tsx` is removed from `AudienceTab.tsx` (file kept unused only if referenced elsewhere — otherwise deleted).
- No changes to payments, reservations, or feed logic.

## Extra suggestions (not included unless you want them)

1. **Segments**: label each fan as Nuevo / Recurrente / VIP based on score thresholds, and let the business filter the list.
2. **Message / invite shortcut**: per-row action to open a chat or send a special invite to a top fan.
3. **Churn signal**: highlight fans with high lifetime score but no activity in 60 days ("Se están enfriando").
4. **Period toggle**: reuse `PeriodSelector` so the fan base can be seen for 7d / 30d / all time.
5. **Export**: copy the top-fan list (name + username) for promo campaigns.

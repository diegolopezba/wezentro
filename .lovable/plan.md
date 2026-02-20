
# Business Dashboard Enhancement

## What changes

The current dashboard focuses heavily on guestlist metrics but misses several data sources that are already in the database. Here's what we'll add and improve:

### 1. New Overview Stats (expand the 2x2 grid to include more)
- **Total Reservations** -- pulled from the `reservations` table where `business_id = user.id`
- **Total Likes** -- sum of likes across all events (already fetched in event performance but not shown in overview)
- **Total Views** -- sum of event_interactions views across all events

### 2. New "Reservations Summary" Section
For businesses with reservations enabled, show:
- Upcoming reservations count (future dates, status = confirmed)
- Total guests expected (sum of party_size for upcoming)
- A small list of the next 3-5 upcoming reservations with date, time, party size

### 3. New "Audience Insights" Section
- **Top Followers** -- show the 5 most recent followers with avatars (helps businesses know who's engaging)
- **Follower Growth** -- show new followers in the last 7 days vs previous 7 days as a trend percentage on the Followers stats card

### 4. Sponsored Posts Performance Summary
Currently the Promociones section shows individual cards. We'll add a quick aggregate row at the top:
- Total impressions, total clicks, total spent, and an overall CTR (click-through rate) across all sponsored posts

### 5. "Quick Actions" Row
A horizontal row of shortcut buttons at the top of the dashboard:
- Create Event, Manage Reservations, Edit Menu, View Profile -- so business owners can quickly jump to key actions

### 6. Business Type Badge in Header
Show the selected business type (e.g., "Bar", "Restaurante") as a subtle badge next to the dashboard title

---

## Technical Details

### New hooks / data fetching
- Add `useReservationStats()` to `useBusinessAnalytics.ts` -- queries `reservations` table for counts and upcoming list
- Add `useRecentFollowers()` to `useBusinessAnalytics.ts` -- queries `follows` joined with `profiles` for the 5 most recent followers
- Expand `useOverviewStats` to also return `totalLikes`, `totalViews`, and `totalReservations`
- Add follower trend calculation (last 7d vs previous 7d)

### New components
- `src/components/dashboard/QuickActions.tsx` -- horizontal scrollable row of action buttons
- `src/components/dashboard/ReservationsSummary.tsx` -- upcoming reservations mini-list
- `src/components/dashboard/AudienceInsights.tsx` -- recent followers with avatars + follower trend
- `src/components/dashboard/SponsoredSummaryBar.tsx` -- aggregate impressions/clicks/CTR bar

### Modified files
- `src/hooks/useBusinessAnalytics.ts` -- expand overview stats, add reservation stats, add recent followers hooks
- `src/pages/BusinessDashboard.tsx` -- integrate all new sections, add business type badge in header, reorder sections for better flow
- `src/components/dashboard/PromocionesSection.tsx` -- add aggregate stats bar at the top when sponsored posts exist

### Section Order (top to bottom)
1. Business type badge in header
2. Quick Actions row
3. Overview Stats (expanded grid: Events, Guestlist Signups, Check-ins, Followers, Reservations, Views)
4. Repeat Attendees card (existing)
5. Reservations Summary (new, only if reservations enabled)
6. Promociones with aggregate bar (existing, enhanced)
7. Event Performance table (existing)
8. Event Comparison chart (existing)
9. Audience Insights (new)
10. Guestlist Funnel (existing)
11. Status Breakdown pie chart (existing)

### No database changes needed
All data already exists in the current schema. We're just querying existing tables more effectively.

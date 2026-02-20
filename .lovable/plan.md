

# Instagram/TikTok-Level Analytics Redesign

## Overview

Restructure the Business Dashboard into a tabbed analytics system inspired by Instagram Insights and TikTok Analytics, with context-aware sections that only appear when relevant to the business type (e.g., Reservations only for businesses that have it enabled).

## New Dashboard Structure

The dashboard will be reorganized into **4 main tabs**:

1. **Overview** -- high-level summary (accounts reached, interactions, followers)
2. **Content** -- per-event performance with reach, engagement rate, shares
3. **Audience** -- demographics (age, gender, city), peak activity, follower growth chart
4. **Actions** -- profile visits, reservations, guestlist conversions, competitive benchmark

## Database Changes

A new `profile_visits` table to track when users visit a business profile:

```text
profile_visits
  - id (uuid, PK)
  - profile_id (uuid) -- the business being visited
  - visitor_id (uuid, nullable) -- logged-in visitor
  - created_at (timestamptz)
```

RLS: Business owners can SELECT their own visits. Authenticated users can INSERT.

## Tab 1: Overview (Default View)

Time-period selector: **Last 7 days | Last 30 days | All time**

Metrics with week-over-week trends (percentage change):
- **Accounts Reached** -- unique users who viewed any of your events (from `event_interactions` type=view, count distinct user_id)
- **Total Interactions** -- sum of all event_interactions (views + clicks + shares + joins + dwells)
- **Engagement Rate** -- (interactions / views) * 100
- **Profile Visits** -- from new `profile_visits` table
- **Followers** -- total + trend
- **Content Published** -- events created in period

Below the stats grid, a **mini line chart** showing daily accounts reached over the selected period.

## Tab 2: Content

Per-event cards (most recent first) showing:
- Thumbnail + title + date
- **Reach** (unique viewers)
- **Impressions** (total views including repeats)  
- **Engagement Rate** (likes + guestlist joins + shares) / reach
- **Likes**, **Shares**, **Guestlist Joins**, **Check-ins**

Tap an event card to expand detailed per-event breakdown.

Keeps existing **Event Comparison** bar chart but adds reach as a bar.

## Tab 3: Audience

### Demographics (from profiles of users who interacted with your events)
- **Age Distribution** -- horizontal bar chart bucketed (18-24, 25-34, 35-44, 45+)
- **Gender Split** -- pie/donut chart (male, female, other, not specified)
- **Top Cities** -- list of cities (from profiles.city of interactors)

### Follower Activity
- **Follower Growth Chart** -- line chart showing cumulative followers over the last 30 days
- **Recent Followers** -- existing list with avatars (keep current component)

### Audience Overlap (if enough data)
- **Repeat Attendees** -- existing metric, shown here

## Tab 4: Actions and Conversions

### Conversion Funnel (enhanced)
- Views -> Likes -> Guestlist Requests -> Approved -> Checked In (with drop-off percentages)

### Profile Actions
- Profile visits over period
- "Reservar" button taps (trackable via new interaction type)
- Menu views (trackable via new interaction type)

### Reservations Module (ONLY if `profile.reservations_enabled`)
- Upcoming reservations summary
- Reservation trend (this week vs last week)
- Average party size
- Cancellation rate

### Competitive Benchmark
Compare your performance against the **average of other businesses of the same `business_type`** in the platform:
- Your avg reach per event vs platform avg
- Your avg engagement rate vs platform avg
- Your follower growth rate vs platform avg
- Your avg guestlist fill rate vs platform avg

This uses aggregated anonymous data -- no individual business is exposed. Queries will compute averages across businesses with the same `business_type`.

### Sponsored Performance (ONLY if business has sponsored posts)
- Existing Promociones section with aggregate summary bar

## Conditional Sections Logic

| Section | Condition |
|---------|-----------|
| Reservations module | `profile.reservations_enabled === true` |
| Guestlist Funnel | business has at least 1 event with `has_guestlist = true` |
| Sponsored Performance | business has at least 1 sponsored post |
| Menu analytics | `profile.menu_enabled === true` |
| Competitive Benchmark | `profile.business_type` is set |
| Demographics | at least 10 interactions exist |

## Technical Details

### New/Modified Files

**Database migration:**
- Create `profile_visits` table with RLS
- Add `profile_view` and `menu_view` and `reserve_tap` to tracked interaction types in `analyticsTracking.ts`

**New tracking (analyticsTracking.ts):**
- `trackProfileVisit(profileId, visitorId)` -- called from `UserProfile.tsx`
- `trackMenuView(eventOrProfileId, userId)` -- called from `MenuSheet.tsx`
- `trackReserveTap(businessId, userId)` -- called from `ReservationSheet.tsx`

**New hooks (useBusinessAnalytics.ts):**
- `useAccountsReached(period)` -- unique viewers across all events in period
- `useInteractionSummary(period)` -- total interactions breakdown by type
- `useAudienceDemographics()` -- age/gender/city from profiles of interactors
- `useFollowerGrowthChart(days)` -- daily follower count for line chart
- `useProfileVisits(period)` -- count from profile_visits
- `useCompetitiveBenchmark()` -- averages for same business_type
- `useReservationTrends()` -- reservation analytics over time
- Refactor existing hooks to accept a `period` parameter (7d/30d/all)

**New components:**
- `src/components/dashboard/AnalyticsTabs.tsx` -- tab navigation (Overview, Content, Audience, Actions)
- `src/components/dashboard/OverviewTab.tsx` -- accounts reached, interactions, engagement rate, mini chart
- `src/components/dashboard/ContentTab.tsx` -- per-event cards with expanded metrics
- `src/components/dashboard/AudienceTab.tsx` -- demographics charts, follower growth, recent followers
- `src/components/dashboard/ActionsTab.tsx` -- conversion funnel, profile actions, reservations, benchmark
- `src/components/dashboard/CompetitiveBenchmark.tsx` -- comparison cards vs platform average
- `src/components/dashboard/DemographicsCharts.tsx` -- age bars, gender donut, city list
- `src/components/dashboard/FollowerGrowthChart.tsx` -- line chart using recharts
- `src/components/dashboard/PeriodSelector.tsx` -- 7d / 30d / All time toggle

**Modified files:**
- `src/pages/BusinessDashboard.tsx` -- replace flat layout with tabbed structure
- `src/pages/UserProfile.tsx` -- add `trackProfileVisit()` call
- `src/components/menu/MenuSheet.tsx` -- add `trackMenuView()` call
- `src/components/reservations/ReservationSheet.tsx` -- add `trackReserveTap()` call
- `src/lib/analyticsTracking.ts` -- add new tracking functions

### Implementation Order
1. Database migration (profile_visits table)
2. New tracking functions + integrate into existing pages
3. New analytics hooks with period support
4. Tab components (Overview first, then Content, Audience, Actions)
5. Competitive benchmark (last, as it needs aggregated data)
6. Integrate everything into BusinessDashboard.tsx


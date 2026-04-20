
User picked option 1: switch masonry cards to `rounded-xl` (16px to match Pinterest) and audit other card surfaces for consistency.

Let me check the relevant card surfaces to make a complete audit.
<lov-tool-use id="toolu_vrtx_01UGqR6sddEt31hSJtWaQkHh" name="code--search_files" integration-id="code" data="{\"query\": \"rounded-2xl|rounded-3xl\", \"include_patterns\": \"src/components/events/*.tsx,src/components/map/*.tsx,src/components/dashboard/*.tsx,src/components/chat/*.tsx,src/components/notifications/*.tsx,src/components/profile/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01UgL4sxHEbpW4QYpqJDypFj" name="code--search_files" integration-id="code" data="{\"query\": \"rounded-2xl|rounded-3xl\", \"include_patterns\": \"src/components/**/*.tsx,src/pages/**/*.tsx\"}">
</lov-tool-use>
I have enough context. The masonry feed cards are the primary target. Let me present the plan.

<lov-plan>
Pinterest uses 16px (`rounded-xl` in our config since `--radius: 1rem`). Currently the feed cards use `rounded-2xl` (~24px). Goal: match Pinterest while keeping the rest of the app visually consistent.

## Scope: feed/grid event cards only

These are the "Pinterest-style" cards that should switch from `rounded-2xl` → `rounded-xl`:

1. **`src/components/events/TimelineCard.tsx`** — media wrapper (line ~125)
2. **`src/components/events/EventCard.tsx`** — media wrapper
3. **`src/components/events/RelatedEventsFeed.tsx`** — skeleton placeholder
4. **`src/components/skeletons/index.tsx`** — `EventFeedSkeleton` masonry items (so loading state matches)

## Out of scope (intentionally kept at `rounded-2xl`)

These are not "pin cards" — they're sheets, panels, banners, notification rows, dashboard cards. Changing them would flatten the visual hierarchy:

- Notification rows (`Notifications.tsx`)
- Dashboard summary cards (`ReservationsSummary`, `PromocionesSection`, etc.)
- Tickets list rows
- Referrals hero banner
- Auth prompt panel in `EventDetail`
- Reservation confirmation pass card (intentionally larger radius for ticket feel)

Rationale: Pinterest itself uses different radii for pins (16px) vs surfaces/modals. Mirroring that gives a cleaner hierarchy: **content = 16px, surfaces = 24px**.

## Audit result

After grepping `rounded-2xl|rounded-3xl` across 41 files, the only true "card-like grid items" that should match Pinterest are the 4 files above. Everything else is a surface/panel and stays as-is.

## Implementation
Single-line className swaps in 4 files. No logic changes, no new dependencies.

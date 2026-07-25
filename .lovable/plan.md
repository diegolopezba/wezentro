## What I found

Your account does have real sales in the database:

- Event **"Test 2"** has 2 confirmed payments of Bs. 10 each (Bs. 20 total) plus 1 pending.
- Those are the only confirmed payments across your 31 events.

The data isn't showing because of a filter in the account-level sales query (`get_creator_sales_by_event`). It only returns events that have a row in the ticket-tiers table with a price above zero. "Test 2" (and your other priced events like "Mar Adentro", "80s party", "rooftop session") store their price directly on the event, not as ticket tiers — only "The Groove Temple" has actual tiers, and that one has zero sales.

So every event with real revenue gets filtered out, and the Resumen tab computes its totals (revenue, tickets, average ticket, attribution donut) from that same empty list → Bs. 0. The monthly chart uses a different query that reads payments directly, which is why parts of the page look inconsistent.

## The fix

Update the sales-by-event database function so an event is included when **any** of these is true:

- it has a paid ticket tier, or
- the event's own price is greater than zero, or
- it has at least one confirmed payment (so historical sales never disappear).

Also make capacity fall back to the event's guest-list capacity when there are no ticket tiers, so the "sold / capacity" progress bar is meaningful for tier-less events.

No UI changes are needed — the Resumen, Por evento and Promotores tabs will pick up the corrected rows automatically.

### Technical notes

- Single migration replacing `public.get_creator_sales_by_event` (security definer, still scoped to `auth.uid()`); the `WHERE` clause gains the price/confirmed-payment alternatives and the capacity lateral falls back to `events.max_guestlist_capacity`.
- `get_creator_sales_monthly` and `get_creator_promoter_leaderboard` are already correct and stay as-is.
- After the migration I'll verify by running the function as your user and confirming "Test 2" reports 2 tickets / Bs. 20.

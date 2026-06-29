
# Promoter Tracking System (v1)

Business accounts get a per-event dashboard where they create named promoter links, share them, and watch sales + funnel stats attributed to each promoter. No promoter accounts, no commissions — pure tracking.

## What the user gets

1. **"Promotores" button** on every event the business owns → opens the per-event dashboard.
2. **Create a promoter** by typing a name (e.g. "Carlos"). System generates a short code like `c7k2`.
3. **Shareable link** per promoter: `zentro.today/e/{eventId}?p=c7k2` with copy / WhatsApp / share-sheet buttons.
4. **Per-event dashboard** showing:
   - Tickets sold & revenue by tier (sold / capacity / Bs. total)
   - Promoter leaderboard ranked by tickets sold
   - Funnel per promoter: link clicks → event views → guestlist requests → approved → checked-in → tickets sold
   - Organic vs promoter-attributed split
5. **Gated to business accounts** (`profile.is_business = true`). Non-business owners see nothing.

## How attribution works

- Visiting `?p=<code>` stores `{ eventId, promoterCode, ts }` in `localStorage` under `zentro_attr_{eventId}` for 7 days.
- Same hit fires a `promoter_clicks` insert (deduped per day per fingerprint, mirroring `sponsored_clicks`).
- On any downstream conversion for that event in that session (guestlist join, ticket purchase, save, like), we read the attribution and attach `promoter_id` to the row.
- After conversion, attribution is **not** consumed — last-touch wins for 7 days, like Instagram/Shopify defaults.

## Technical details

### New tables
```text
event_promoters
  id, event_id, created_by (business uuid), name, short_code (unique per event),
  is_active, created_at

promoter_clicks
  id, promoter_id, event_id, viewer_id (nullable), viewer_fingerprint,
  created_at
  UNIQUE (promoter_id, COALESCE(viewer_id, fingerprint), day)  -- dedupe
```

### Existing tables — add nullable `promoter_id uuid` to:
- `guestlist_entries`
- `payment_sessions` (ticket sales)
- `event_likes`, `saved_events` (optional, low priority — can defer)

All new columns are nullable so existing flows are untouched.

### RLS
- `event_promoters`: SELECT/INSERT/UPDATE only by the event's `creator_id` (and that creator must be a business). Public can `SELECT` minimal fields (id, short_code) via a security-definer RPC `resolve_promoter(event_id, short_code)` used by the attribution capture — no list exposure.
- `promoter_clicks`: INSERT via security-definer RPC `log_promoter_click`; SELECT only by event creator.

### RPCs
- `resolve_promoter(_event_id, _code)` → returns `promoter_id` if active, else null.
- `log_promoter_click(_promoter_id, _fingerprint)` → dedupes, inserts, bumps an aggregate.
- `get_event_promoter_stats(_event_id)` → returns rows of `{ promoter_id, name, clicks, views, gl_requests, gl_approved, checked_in, tickets_sold, revenue_bs }`. Heavy joins, server-side, business-only.
- `get_event_ticket_breakdown(_event_id)` → per `ticket_tier`: sold, capacity, revenue.

### Frontend
- New page `src/pages/EventPromoterDashboard.tsx` at route `/business/event/:eventId/promoters`.
- New hook `src/hooks/usePromoters.ts` (list/create/toggle promoters, fetch stats).
- New component `src/components/promoters/PromoterCard.tsx` — name, short link, copy/share, mini-stats.
- New component `src/components/promoters/PromoterLeaderboard.tsx` — sorted by tickets sold.
- New component `src/components/promoters/FunnelByPromoter.tsx` — reuses the funnel pattern from `ActionsTab`.
- New util `src/lib/promoterAttribution.ts` — `captureFromUrl()`, `getAttribution(eventId)`, `clearExpired()`.
- Wire `captureFromUrl()` into `src/pages/EventDetail.tsx` mount.
- Wire `getAttribution(eventId)` into:
  - `useGuestlist.ts` join mutation
  - ticket purchase flow (`TicketTierPicker` / payment session creation)
- Add **"Promotores"** entry to the event owner action menu (component already exists for owner actions).
- Entry point: a **"Promotores"** quick action on `BusinessDashboard` and on each event card the business owns.

### Gating
- Route guard: redirect to `/` if `!profile.is_business` or `event.creator_id !== user.id`.
- Hide UI entry points for non-business or non-owner viewers.

## Out of scope for v1 (explicit)
- Commission %, owed amounts, payouts.
- Promoter user accounts / promoter login.
- Dedicated short-link domain (`/p/{code}`) — using `?p=` query param only.
- Time-series chart (can add in v2 once data accumulates).
- Attributing likes/saves (low signal; revisit if needed).

## Rollout order
1. Migration: tables, columns, RLS, RPCs.
2. Attribution util + capture on EventDetail.
3. Wire attribution into guestlist + ticket purchase.
4. Dashboard page + hook + components.
5. Entry points (event owner menu, business dashboard quick action).
6. Verify with a smoke test: create promoter → open link in incognito → join guestlist → confirm row attributes to promoter.

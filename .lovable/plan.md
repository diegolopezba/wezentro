# Unified Business Dashboard

One dashboard, gated behind business + payouts, with all segments as horizontal pill tabs.

## Data availability (checked against the live database)

Two things you asked for are **not available** today — flagging instead of approximating:

1. **Ingresos netos (after Qhantuy fees)** — `payment_sessions` stores `amount`, `status`, `provider`, `qhantuy_transaction_id` and the raw callback JSON, but **no fee column**. Unless the fee is reliably present inside `qhantuy_raw_callback` for every confirmed payment, net revenue cannot be computed. Plan: ship gross revenue only, and add net later once we either store a fee per transaction or confirm the callback field.
2. **No-show rate** — `reservations.status` exists, but every row currently in the table is `confirmed`; there is no `no_show` / `completed` distinction being written anywhere. A no-show rate needs a small schema/flow addition (a `no_show` status or a `checked_in_at` column plus a way for the business to mark it). Plan: omit no-show from this pass; cancellation rate is computable if cancelled rows start appearing (`status` + `cancelled_by` exist).

Everything else (revenue, tickets, per-event, per-promoter, capacity, pace) is available via the existing RPCs `get_creator_sales_by_event`, `get_creator_sales_monthly`, `get_creator_promoter_leaderboard` and the `payment_sessions` / `ticket_tiers` tables.

## 1. Access gating

- New hook `useDashboardAccess`: `profile.is_business === true` **and** a `qhantuy_beneficiaries` row for the user with non-null `beneficiary_code` (same query shape as `BusinessPaymentSettings.tsx`).
- Add the dashboard entry to the main **Settings** page under the Business section:
  - both conditions true -> "Dashboard" row linking to `/dashboard`
  - business but no payouts -> a prompt row "Termina de configurar tus pagos para desbloquear tu dashboard" linking to the payout settings page
  - not business -> nothing
- `/dashboard` itself re-checks both conditions and renders the payout prompt instead of empty tabs when payouts are missing.

## 2. Pill tabs

`BusinessDashboard.tsx` keeps its `Tabs` but the `TabsList` becomes a horizontally scrollable pill row (same pill visuals already used in `BusinessSales.tsx`): Overview · Contenido · Audiencia · Acciones · Ventas · Reservas · Próximamente.

Contenido / Audiencia / Acciones are carried over untouched.

## 3. Overview — revenue + pace

Above the existing engagement cards, three new `StatsCard`s driven by the shared `PeriodSelector`:

- Ingresos totales (gross, period-scoped)
- Tickets vendidos (period-scoped)
- Ticket promedio (replaces the requested "Ingresos netos" slot until fees are available)

New **Ritmo de venta** section: for each upcoming event, a progress bar of tickets sold vs summed `ticket_tiers.capacity`, the percentage, and days remaining. The "ahead/on par/behind past events" comparison is deferred to a later pass as you allowed.

## 4. Ventas tab

Sections in one scroll: the `SalesSummary` content (hero revenue, mini cards, revenue-over-time area chart, promoter/organic donut), then per-event and per-promoter breakdowns.

- Per event: rows of event, tickets sold, revenue (from `get_creator_sales_by_event`, already includes capacity and check-ins), sortable by recency / tickets.
- Per promoter: the existing leaderboard table extended so every row shows clicks, tickets and revenue (the RPC already returns `tickets_sold` and `revenue_bs`).

The old `/settings/business/sales` route and its three screens stay live until you confirm parity; nothing is deleted in this pass.

## 5. Reservas tab

Period-scoped via the same `PeriodSelector`:

- Total reservas and total invitados for the period
- Cancellation rate (cancelled vs total)
- Day-of-week / time-slot breakdown, rendered only when the period has 20+ reservations
- The existing next-5-upcoming list, moved in as-is
- No-show rate omitted (see data note above)

## 6. Próximamente tab

Static empty-state screen: "Insights de la ciudad — próximamente" plus two teaser lines about cross-venue benchmarking. No data logic.

## Technical notes

- New: `src/hooks/useDashboardAccess.ts`, `src/hooks/useSalesOverview.ts` (period-scoped revenue/tickets from `payment_sessions` where `business_user_id = user` and `status = 'confirmed'`), `src/components/dashboard/SalesTab.tsx`, `ReservasTab.tsx`, `ComingSoonTab.tsx`, `SalesPaceSection.tsx`.
- Edited: `BusinessDashboard.tsx` (pills + gating + new tabs), `OverviewTab.tsx` (revenue cards + pace), `Settings.tsx` (entry point), `SalesPromoters.tsx` (tickets/revenue columns).
- No database migration required for this pass.

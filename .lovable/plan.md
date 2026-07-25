## Status: ~60% already built

Verified: per-event ticketing data already exists and works — the page at `/business/event/{eventId}/promoters` shows tickets sold, revenue, promoter-attributed vs organic split, sales per ticket tier, and per-promoter stats, backed by three existing database functions (`get_event_promoter_totals`, `get_event_ticket_breakdown`, `get_event_promoter_stats`). It's just buried behind Dashboard → Contenido → expand an event card.

Missing: any all-events/all-time sales view, and a single home for it.

## What to build

### One entry point: "Ventas y promotores"
A new row in the Business hub (`BusinessSettings`), alongside Menú and Reservas, opening a dedicated page at `/business/sales`. Everything ticketing-related lives there.

### Inside: pill-based sections
A horizontal pill row (same style as the map category pills) switching between:

**1. Resumen (default) — all-time overall sales**
- Hero number: total revenue all time, with tickets sold underneath.
- Secondary cards: paid events count, average ticket price, average revenue per event.
- Area chart of revenue over time (monthly buckets all-time, with a toggle for 30d).
- Donut: promoter-attributed vs organic revenue across all events.

**2. Eventos**
- List of the owner's paid events ranked by revenue, each row showing revenue, tickets sold vs capacity and a small progress bar.
- Tapping a row opens the per-event detail (section 3) with that event selected.

**3. Por evento**
- Event picker at top, then the existing per-event content, reused: totals, ventas por tier with progress bars, plus new payment-status breakdown (pagado / pendiente / expirado) as a small stacked bar, and check-in rate vs tickets sold.

**4. Promotores**
- Cross-event promoter leaderboard: tickets sold, revenue, clicks, conversion rate, with a horizontal bar chart of the top performers.
- Per-event promoter creation and management stays where it is today, reachable from the event picker in section 3.

### Cleanup
- Remove the standalone "Promotores y ventas" button from the dashboard Contenido tab and point it to the new page instead (keeping `/business/event/:eventId/promoters` working as a deep link so existing promoter flows don't break).

### Technical notes
- Per-event sections need no new backend — the three existing functions cover them.
- The all-time rollup needs one new security-definer function, `get_creator_sales_summary(_user_id)`, returning per-event and per-month revenue/ticket totals scoped to `auth.uid()` = event creator, so the client doesn't pull every payment row.
- New: `src/pages/BusinessSales.tsx`, section components under `src/components/sales/`, hooks added to `src/hooks/usePromoters.ts`.
- Charts use the existing `recharts` setup already in the dashboard. Currency stays `Bs.`, dark theme, pill buttons — consistent with the rest of the app.

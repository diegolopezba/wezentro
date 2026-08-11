# Reorder business dashboard pills and split Promotores into its own tab

## Current state

The unified dashboard already has pill tabs, but the order is: Overview, Contenido, Audiencia, Acciones, Ventas, Reservas, Próximamente. The `Ventas` tab currently renders `SalesSummary`, `SalesEvents` (per-event), and `SalesPromoters` (per-promoter) stacked in one scroll.

## Change

1. Reorder tabs to: Overview, Ventas, Promotores, Audiencia, Contenido, Acciones, Reservas, Próximamente.
2. Create a dedicated `Promotores` tab containing the per-promoter breakdown (`SalesPromoters`).
3. Slim the `Ventas` tab to: `SalesSummary` + per-event `SalesEvents` only.
4. Keep all existing components and data logic unchanged; only re-wire the tab shell and split the content wrapper.

## Files to change

- `src/pages/BusinessDashboard.tsx` — update the `TABS` array and add a `TabsContent` for `promotores`.
- `src/components/dashboard/SalesTab.tsx` — remove the per-promoter section.
- `src/components/dashboard/PromotersTab.tsx` — new wrapper that renders `SalesPromoters`.

## Non-goals

No new data fetching, no new RPCs, no styling changes, no route changes. The existing `SalesPromoters` stat grid (tickets, revenue, conversion, clicks) stays as-is.

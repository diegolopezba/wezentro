# Simplify Promotores tab

## Goal
Remove the analytics/summary sections from the business event Promotores tab so it only contains promoter creation and the promoter list.

## What to change
Edit `src/components/business/EventPromotersPanel.tsx`:

1. Remove the two summary cards: "Tickets vendidos" and "Ingresos".
2. Remove the `<ConversionFunnel period="all" eventId={eventId} />` block.
3. Remove the "Ventas por tier" ticket-tier breakdown section.
4. Keep the "Nuevo promotor" input + create button section.
5. Keep the "Tus promotores" leaderboard section with `<PromoterCard>` cards.
6. Clean up now-unused imports and helpers: `Ticket`, `TrendingUp`, `ConversionFunnel`, `useTicketBreakdown`, `usePromoterTotals`, and the local `SummaryCard` component.

## Verification
- Run TypeScript typecheck.
- Run Vitest suite.
- Visually confirm the Promotores tab renders only the two remaining sections.

## Scope
This affects both the inline Promotores tab in `EventDetailPanel.tsx` and the legacy `/business/event/:id/promoters` page, because they share `EventPromotersPanel`. No backend or routing changes are required.

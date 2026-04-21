

# Plan: Multiple ticket tiers (Shotgun + Dice model)

## How the leaders do it

**Dice** — *Sequential* tiers. "Tier One: 50 tix at £5, Tier Two: 50 tix at £10. Tier Two only unlocks after Tier One sells out." Buyer always sees one price (the cheapest currently available). Drives urgency.

**Shotgun** — *Parallel* tiers. All tickets visible at once with their own name, price, capacity (e.g. General Bs.50 / VIP Bs.150 / Backstage Bs.300). Buyer picks. Optional category grouping.

Your use case ("different tiers" + "different sectors") needs both. We support both with one toggle per event.

---

## Data model (1 new table, no breaking changes)

**`ticket_tiers`**
- `id` uuid PK
- `event_id` uuid FK → events
- `name` text (e.g. "Early Bird", "VIP", "General")
- `description` text nullable
- `price` numeric (Bs.)
- `capacity` integer nullable (null = unlimited)
- `sold_count` integer default 0
- `display_order` integer (drag-to-reorder)
- `unlock_after_tier_id` uuid nullable, self-FK → ticket_tiers — **this is the magic field**: if set, tier is hidden until the referenced tier hits `sold_count >= capacity`. Null = always visible. This single field cleanly expresses both Shotgun (all null = parallel) and Dice (chained = sequential).
- `is_active` boolean
- `created_at`, `updated_at`

**`guestlist_entries.ticket_tier_id`** — new nullable FK. Existing entries (and free events / single-price events) stay null and behave exactly like today.

**`payment_sessions.ticket_tier_id`** — new nullable FK so each QR is bound to a tier.

**Backwards compat**: `events.price` stays as the fallback when an event has zero tier rows. No migration of old data needed.

**Atomicity**: New `increment_tier_sold(_tier_id)` SECURITY DEFINER function bumps `sold_count` in a single UPDATE … RETURNING, also re-validating capacity to prevent overselling under concurrent buyers.

---

## Owner UX — creating tiers

A new **`TicketTiersEditor`** component, used inside both `Create.tsx` and `EditEventSheet.tsx` (business accounts only, paid events only).

The current "Precio (Bs)" field becomes a section with two modes:

```text
○ Precio único       Bs. [    ]
● Múltiples entradas

  ┌──────────────────────────────────────┐
  │ ≡  Early Bird     Bs.50   /80   ✏  ✕ │
  │ ≡  General        Bs.80   /200  ✏  ✕ │
  │ ≡  VIP            Bs.150  /50   ✏  ✕ │
  └──────────────────────────────────────┘
   + Añadir tipo de entrada

  Modo de venta
  ● Todas a la vez (Shotgun)
  ○ Por orden, una tras otra (Dice)
```

- **"Todas a la vez"** → all `unlock_after_tier_id` = null (parallel).
- **"Por orden"** → auto-chains them by `display_order` (each tier's `unlock_after_tier_id` = the previous one).
- Drag-to-reorder updates `display_order` (and re-chains the unlock chain in sequential mode).
- Per-row sheet to edit name / price / capacity / description.

Validation: name required, price ≥ 0, capacity ≥ 1 or empty.

---

## Buyer UX — picking a tier

In `EventDetailModal` and `EventDetail` page, the floating CTA changes based on tier count:

| Scenario                   | CTA shows                                | Tap behavior                          |
|----------------------------|------------------------------------------|---------------------------------------|
| 0 tiers (legacy)           | `Bs. X — Comprar`                        | Same as today                         |
| 1 tier                     | `Tier name · Bs. X — Comprar`            | Opens PaymentQRModal directly         |
| 2+ parallel tiers          | `Desde Bs. X — Comprar`                  | Opens **TicketTierPicker** sheet      |
| 2+ sequential, current=N   | `Tier N · Bs. X — Comprar`               | Opens PaymentQRModal for current tier |
| All tiers sold out         | `Agotado` (disabled)                     | —                                     |

**`TicketTierPicker`** bottom sheet (parallel mode):
```text
Elige tu entrada

┌────────────────────────────────────────┐
│ Early Bird                    Bs. 50  │  ← Agotado (greyed)
│ Solo para los primeros 80              │
├────────────────────────────────────────┤
│ General                       Bs. 80  │  ← tappable
│ Quedan 47                              │
├────────────────────────────────────────┤
│ VIP                          Bs. 150  │  ← tappable
│ Acceso al área VIP                     │
└────────────────────────────────────────┘
```

Sequential mode hides locked tiers entirely (Dice behavior — buyer never sees the next price until current is gone). A subtle "Próximas tandas: 2 más" hint appears below to communicate that more (pricier) tiers exist.

Status badges on every tier card:
- `Quedan N` if capacity − sold_count ≤ 10
- `Agotado` if sold_count ≥ capacity
- `Próximamente` if `unlock_after_tier_id` not yet sold out (only shown to owner in preview)

---

## Dynamic QR per tier

`generate-bnb-qr` edge function gains a `ticketTierId` param:
- Looks up the tier's `price` (instead of `events.price`).
- Re-checks tier is unlocked + has capacity (returns 409 if just sold out — buyer sees "Esta entrada se agotó, elige otra").
- BNB `gloss` field becomes `"{event.title} — {tier.name}"` so the buyer's bank shows what they're paying for.
- Stores `ticket_tier_id` on the new `payment_sessions` row.

`check-bnb-payment-status` on confirm:
- Calls `increment_tier_sold(tier_id)` atomically.
- If that fails (race-condition oversell), refunds via marking session `failed` and notifies user — extremely unlikely but defensive.
- Stamps the new `guestlist_entries` row with `ticket_tier_id`.

---

## Owner management view

In `GuestlistManagementSheet`, the existing list gets a tier filter chip row at the top (`Todas · Early Bird · VIP · …`) plus per-tier sold/capacity counters. Each guest entry shows a small tier badge next to their name. Stats card at the top: total revenue per tier.

In the user-facing `/tickets` page, each ticket card shows the tier name as a subtitle.

---

## Files

**New**
- `supabase/migrations/*.sql` — `ticket_tiers` table + 2 nullable FKs + RLS + `increment_tier_sold` function
- `src/hooks/useTicketTiers.ts` — list / create / update / reorder / delete + realtime subscription
- `src/components/events/TicketTiersEditor.tsx` — owner editor (used by Create + Edit)
- `src/components/events/TicketTierPicker.tsx` — buyer bottom sheet
- `src/components/events/TicketTierBadge.tsx` — small reusable label for guest lists / tickets

**Edited**
- `supabase/functions/generate-bnb-qr/index.ts` — `ticketTierId` param + capacity re-check
- `supabase/functions/check-bnb-payment-status/index.ts` — call `increment_tier_sold`
- `src/pages/Create.tsx` — replace single price field with `TicketTiersEditor`
- `src/components/events/EditEventSheet.tsx` — same swap
- `src/components/events/EventDetailModal.tsx` + `src/pages/EventDetail.tsx` — tier-aware CTA, picker integration
- `src/components/events/PaymentQRModal.tsx` — accepts `ticketTierId`, shows tier name in header
- `src/hooks/useEventDetailState.ts` — derive `cheapestTier`, `currentSequentialTier`, `allSoldOut`, route `handleBuyTicket` through tier resolution
- `src/components/events/GuestlistManagementSheet.tsx` — tier filter + per-tier stats
- `src/pages/Tickets.tsx` — show tier name on each ticket

## Out of scope (separate features)

- Waitlist (next milestone — already discussed, deferred per your request)
- Group / bundle tickets ("buy 4 get 1 free")
- Promo codes / discount tiers
- Reserved seating maps
- Time-windowed sales (`sale_start_at` / `sale_end_at`) — easy to add later as a new column


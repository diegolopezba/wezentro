## Goal

Event owners can generate single-use invite links that give a person a free ticket to a paid event. The invitee — even if they don't have an account yet — lands on the event, taps "Aceptar invitación especial", confirms in the bottom sheet, and gets a ticket marked "Invitado especial". These guests count against event capacity and tier stock.

## Database

New table `public.event_special_invites`:
- `event_id`, `created_by`, `token` (unique, random), `ticket_tier_id` (nullable — which tier the free spot comes from), `label` (optional name/note the owner types), `status` (`pending` / `redeemed` / `revoked`), `redeemed_by`, `redeemed_at`, `created_at`
- RLS: event owner can create/read/revoke their event's invites; anyone authenticated can read a single row by token (needed to display the invite); redemption happens in a server function, not by direct update.
- GRANTs for `authenticated` and `service_role`.

`guestlist_entries`: add `is_special_guest boolean not null default false` (and reuse existing `payment_status`, set to `comped`/`paid`-equivalent so the guest is treated as fully confirmed).

New security-definer function `redeem_special_invite(_token text)`:
- Validates the token exists, is `pending`, event not deleted/ended.
- Enforces capacity: rejects if event is full or the chosen tier is sold out; bumps `sold_count` via existing `increment_tier_sold` when a tier is attached.
- Inserts an approved `guestlist_entries` row with `is_special_guest = true` and QR token, marks the invite `redeemed` by `auth.uid()`, all in one transaction (idempotent if the same user re-runs it).

## Link + auth flow

- Share URL: `https://zentro.today/i/<token>`.
- New route `/i/:token`:
  - Not signed in → store the token, send the user to `/auth` with `returnTo`.
  - Signed in → redirect to `/event/:eventId?invite=<token>`.
- After signup, `Onboarding` finishes by honoring the stored pending invite instead of always going to `/`.
- Invalid / already-redeemed / revoked tokens show a friendly screen and a link to the event.

## Event detail

When `?invite=<token>` resolves to a valid pending invite for that event:
- The CTA bar shows "Aceptar invitación especial" (brand red) instead of "Comprar" — also overriding the sold-out state when the invite reserves a spot.
- Tapping it opens the existing `PaymentQRModal` in a new `invite` mode: price row reads "Invitación especial", copy explains the host is covering the entry, and the primary button is "Confirmar invitación especial".
- Confirming calls `redeem_special_invite`, then routes to `/going/:eventId`.
- Once redeemed, the CTA returns to the normal "Ver entrada".

## Owner tooling

In `GuestlistManagementSheet`, a new "Invitados especiales" section:
- "Crear invitación" (optional label + tier picker) generates a link and copies/shares it.
- List of generated invites with status (pendiente / usado por @user / revocada) and a revoke action for pending ones.

## Ticket

In `YouAreGoing`, when the entry has `is_special_guest`, show a small "INVITADO ESPECIAL" line above the buyer's name in the details box (uppercase, brand red, tracking-wide), matching the existing card style. Everything else stays identical.

## Technical notes

- Token generated server-side (`encode(gen_random_bytes(16),'hex')`); links are single-use by design, guarded by the `status` check inside `redeem_special_invite`.
- Redemption is done through the DB function so the entry is created with owner-level rights while the client stays restricted by RLS.
- No payment session is created for special guests; sales dashboards keep counting only confirmed payments, but the guestlist/check-in and QR scanner flows work unchanged.

# Invitaciones sin fricción (entrada directa por correo)

Goal: let an event owner mark specific invites (or a whole segment) as **entrada directa** — the guest gets a real, scannable ticket inside the email, with no account, no app, no login. Everyone else keeps today's flow (link → cuenta → entrada en la app).

## How it will work

**For the owner (panel de invitados especiales)**
- Each invite row gets a mode chip: `App` (default, current behaviour) or `Directa` (QR en el correo).
- Toggle per invite from the row menu, and a bulk action "Marcar segmento como entrada directa" from the segment pills.
- Checkboxes on rows + a sticky bar: "Enviar correo (N)" and "Enviar a todo el segmento". Rows without email can only copy/share the link.
- Import sheet gains a default mode for the batch being imported.

**For the guest (entrada directa)**
- Receives an email with: cover image, event title, date, location, host name, "INVITADO ESPECIAL – VIP" kicker, their name, and a **QR code image right in the email**.
- Below the QR, a "Ver mi entrada" button opening a public page `/p/:token` — same ticket, always current, works if the email hides images.
- Under it, a warm, compelling block inviting them to create an account and get the app: event updates and messages from the host, extra details and perks, and everything else happening in the city. Zero obligation — the QR alone gets them in.

**At the door**
- The bouncer/owner scans the same way as today. The scanner accepts both normal tickets and direct-invite QRs.
- One scan only: a second scan shows "ya usada" with the guest name and the check-in time.
- The guestlist/management sheet shows direct guests alongside app guests, with a small "Directa" tag and their check-in state.

**If a direct guest later creates an account**
- Opening `/i/:token` while signed in still converts the invite into a normal in-app ticket, carrying over the check-in state so nobody enters twice.

## Technical notes

Current blocker: `guestlist_entries.user_id` is `NOT NULL`, so a passless guest cannot have a guestlist row. The direct ticket therefore lives on the invite row itself.

Migration on `public.event_special_invites`:
- `delivery_mode text not null default 'app'` (`'app' | 'direct'`)
- `qr_code_token text unique` (generated for direct invites)
- `checked_in_at timestamptz`, `checked_in_by uuid`
- index on `qr_code_token`

New/updated database functions:
- `set_special_invite_mode(_invite_ids uuid[], _mode text)` — owner-only, mints `qr_code_token` when switching to `direct`.
- `get_public_invite_ticket(_token text)` — SECURITY DEFINER, anon-executable, returns only what the public ticket page needs (guest name, segment, event title/date/location/cover, host name, status, checked_in_at). No emails, no other guests.
- `redeem_special_invite` — extended so a direct invite that already checked in still converts correctly and copies `checked_in_at` into the new guestlist entry.

Edge functions:
- `check-in-guest`: after the `guestlist_entries` lookup misses, fall back to `event_special_invites.qr_code_token` for the same event; same atomic single-use update (`.is('checked_in_at', null)`), same response shape, guest name taken from `guest_name`.
- New `invite-qr` public function returning a PNG QR for a token (email clients cannot render inline SVG) with long cache headers.
- `send-special-invites`: pass `deliveryMode`, `qrImageUrl` and `ticketUrl` in `templateData`; keep the existing ownership check, `status='pending'`, and idempotency key.

Templates and routes:
- `special-invite.tsx` branches on `deliveryMode`: existing copy for `app`, QR + ticket link + app-download pitch for `direct`.
- New public route `/p/:token` (`PublicTicket.tsx`), no auth guard, light theme, mirrors the `YouAreGoing` ticket layout, with states for válida / ya usada / cancelada, plus the same "crea tu cuenta" call to action.

Frontend:
- `useSpecialInvites.ts`: add `deliveryMode`/`qrToken`/`checkedInAt` to the type, plus `useSetInviteDeliveryMode` and selection-aware send.
- `SpecialInvitesPanel.tsx`: row checkboxes, mode chip and toggle, segment bulk actions, sticky send bar; Excel export gains `modo` and `check-in` columns.

Security: the public ticket RPC exposes no email addresses and is token-scoped; `event_special_invites` RLS stays owner-only for direct table reads.

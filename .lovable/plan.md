# RSVP sin fricción estilo Luma para invitaciones especiales

Goal: an invited guest can confirm and get a valid scannable ticket **without creating an account, password, or app download** — one tap from the email or the link, name/email pre-filled, QR shown instantly on the page and re-sent by email. The current account-based flow stays available for anyone who wants it.

## How it will work

**For the owner (panel de invitados especiales)**
- Each invite row gets a mode chip: `App` (current flow) or `Directa` (RSVP sin cuenta).
- Toggle per invite from the row menu, plus a bulk action on the segment pills ("Marcar segmento como entrada directa").
- Row checkboxes with a sticky bar: "Enviar correo (N)" and "Enviar a todo el segmento". Rows without an email can only copy/share the link.
- The import sheet gets a default mode for the batch.
- The guest list shows RSVP state per invite: pendiente / confirmado / usado, plus check-in time.

**For the guest — the Luma-style path**
1. Email arrives with cover, title, date, location, host, "INVITADO ESPECIAL – VIP" kicker, and one big button: **Confirmar asistencia**.
2. The button opens the public page `/i/:token` — no auth guard, no redirect to `/auth`. The invite token already carries the guest's name and email, so the page shows them pre-filled (editable) and a single **Confirmar asistencia** button. If the invite has no name/email, the two fields are required, nothing else.
3. One tap confirms. The page immediately renders the ticket: QR, guest name, segment, event details. No password, no profile, no download.
4. A confirmation email follows with the same QR embedded plus a permanent "Ver mi entrada" link back to the page, so the ticket survives a closed tab.
5. Below the ticket, a warm invitation (not a wall) to create an account and get the app: updates and messages from the host, extra details and perks, and everything else happening in the city.

**Returning to the link**
- Reopening `/i/:token` after confirming goes straight to the ticket — the token is the session. No login.
- If the guest is already signed in on the app, the page offers the normal in-app flow instead (invite becomes a real guestlist ticket).

**At the door**
- Same scanner. It accepts both app tickets and RSVP tickets.
- One scan only: a second scan shows "ya usada" with the guest name and the original check-in time.

**If an RSVP guest later creates an account**
- Signing in and opening the link converts the invite into a normal guestlist ticket, carrying over confirmation and check-in state so nobody enters twice.

## Technical notes

Blocker driving the design: `guestlist_entries.user_id` is `NOT NULL`, so a passless guest cannot get a guestlist row. The RSVP ticket therefore lives on the invite row.

Migration on `public.event_special_invites`:
- `delivery_mode text not null default 'app'` (`'app' | 'direct'`)
- `qr_code_token text unique`, minted at RSVP confirmation
- `rsvp_confirmed_at timestamptz`, `rsvp_name text`, `rsvp_email text`
- `checked_in_at timestamptz`, `checked_in_by uuid`
- index on `qr_code_token`

Database functions (all SECURITY DEFINER, token-scoped, anon-executable where noted):
- `get_public_invite(_token text)` — anon. Returns only what the public page needs: guest name/email prefill, segment, event title/date/location/cover, host name, status, `rsvp_confirmed_at`, `checked_in_at`, and `qr_code_token` **only after confirmation**. Never exposes other guests or the owner's list.
- `confirm_invite_rsvp(_token text, _name text, _email text)` — anon. Validates status is `pending`/confirmed, trims and length-checks inputs, mints `qr_code_token` on first call, sets `rsvp_confirmed_at`, and is idempotent on repeat calls. Row-locked so two taps cannot mint two tokens.
- `set_special_invite_mode(_invite_ids uuid[], _mode text)` — owner-only.
- `redeem_special_invite` — extended so an already-confirmed/checked-in direct invite converts cleanly into a guestlist entry with state carried over.

Rate limiting: `confirm_invite_rsvp` is token-scoped and only ever mutates the one invite row, so a brute-forced token is the only attack surface — tokens stay long random values and unknown tokens return a generic "invitación no disponible".

Edge functions:
- `check-in-guest`: when the `guestlist_entries` lookup misses, fall back to `event_special_invites.qr_code_token` for the same event, using the same atomic single-use update (`.is('checked_in_at', null)`) and response shape, with the guest name from `rsvp_name`/`guest_name`.
- New public `invite-qr` function returning a PNG QR for a token (email clients cannot render inline SVG), with long cache headers.
- `send-special-invites`: pass `deliveryMode` and `inviteUrl` in `templateData`; keeps the ownership check, `status='pending'` filter, and idempotency key.
- New confirmation send: after `confirm_invite_rsvp` succeeds, the page calls `send-transactional-email` with the new `invite-confirmed` template (QR image URL + ticket link), keyed by invite id so retries do not duplicate.

Templates and routes:
- `special-invite.tsx` branches on `deliveryMode`: current copy for `app`; for `direct`, "Confirmar asistencia" as the single CTA.
- New `invite-confirmed.tsx`: QR image, event details, "Ver mi entrada" link, and the create-an-account pitch.
- `/i/:token` becomes public (no auth redirect). `SpecialInvite.tsx` is rewritten into three states: RSVP form, ticket, and unavailable — light theme, mirroring the `YouAreGoing` ticket layout. Signed-in users keep the existing forward to the event.

Frontend:
- `useSpecialInvites.ts`: add `deliveryMode`, `qrToken`, `rsvpConfirmedAt`, `checkedInAt` to the type; add `usePublicInvite`, `useConfirmInviteRsvp` (both anon RPCs), and `useSetInviteDeliveryMode`.
- `SpecialInvitesPanel.tsx`: row checkboxes, mode chip and toggle, segment bulk actions, sticky send bar; Excel export gains `modo`, `rsvp` and `check-in` columns.

Security: the public RPCs expose no email addresses other than the token holder's own prefill, and direct table access to `event_special_invites` stays owner-only under RLS.

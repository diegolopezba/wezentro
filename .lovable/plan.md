# Bulk special invitations (CSV / Excel upload)

Automate the manual "special invite" flow so an organizer can invite thousands of guests at once: upload a spreadsheet of names + emails, generate one unique invitation link per person, email each guest their link, and track who confirmed.

## What the organizer gets

1. In the event's guest management sheet, next to the existing manual invite creation, a new **"Importar lista"** option.
2. Upload a `.csv` or `.xlsx` file with two columns: `nombre` and `email` (header detection is flexible: name/nombre, email/correo).
3. Name the batch (the **segment**): a short free-text label such as "VIP", "Prensa", "Staff". Optional — leave it blank for a plain special invite. The same event can have as many segments as the organizer wants, each from its own upload.
4. A preview step showing: rows detected, rows with invalid or missing email, duplicates (within file and against invites already created). Invalid rows are listed and skipped.
5. Confirm → invites are created in batches with a progress bar. Each row becomes a unique single-use link (the existing `/i/:token` flow, unchanged).
6. After import, a choice:
   - **Enviar por email** — every guest receives their personal link by email, sent in a throttled background job with per-guest status (pending / sent / failed / bounced).
   - **Descargar CSV** — export of `nombre, email, segmento, enlace, estado` so the organizer can send via WhatsApp or their own tool.
7. The invite list becomes searchable and virtualized (2000 rows must scroll smoothly), grouped/filterable by segment, with per-row status (pendiente / usada / cancelada), a resend action, and bulk revoke (including "revoke whole segment").


## Guest experience (unchanged flow, no new mechanics)

Guest opens their link → if not registered, they sign up and land back on the event → the event page shows "Aceptar invitación especial" → confirms → gets a free ticket marked "Invitado especial". Exactly the existing behavior; the import just creates many links at once.

**Segment on the ticket:** when the invite came from a named batch, the ticket badge line reads "INVITADO ESPECIAL - VIP" (segment appended after a dash, same line, same styling). With no segment it stays "INVITADO ESPECIAL" as today. The manual one-off invite flow can also take an optional segment name.


## Important note on sending 2000 emails

Zentro's email system is built for one-off app emails (confirmations, receipts) with a throughput around 120/minute, and mass sends from a young sending domain can hurt deliverability. So:

- Sends are queued and throttled — a 2000-guest event will take roughly 20-30 minutes to fully deliver, which is fine for invitations.
- Each email is a genuine personal invitation to a named recipient, which fits the allowed use.
- The CSV export path stays available as a fallback if the organizer prefers WhatsApp.
- Bounces are recorded so the organizer can see which addresses failed and fix them.

## Technical details

**Schema (migration):**
- `event_special_invites`: add `guest_name text`, `guest_email text`, `email_status text default 'not_sent'` (`not_sent | queued | sent | failed`), `email_sent_at timestamptz`, `batch_id uuid`, `segment text` (the batch label, max ~24 chars).
- `guestlist_entries`: add `special_guest_label text` — copied from the invite's `segment` when redeemed, so the ticket can render it without re-reading the invite.
- Index on `(event_id, status)` and `(event_id, batch_id)` for fast filtering at 2000 rows.
- Partial unique index on `(event_id, lower(guest_email))` where `guest_email is not null`, so re-uploading the same file doesn't duplicate a guest.
- Keep existing RLS (owner manages; authenticated can read by token). Restrict the broad "authenticated users can read invites" policy so emails aren't publicly readable — reads limited to the row's own token lookup via a SECURITY DEFINER function used by `/i/:token`, plus full access for the event owner.
- Update `redeem_special_invite` to write `special_guest_label` onto the guestlist entry.

**Bulk creation RPC:** `bulk_create_special_invites(_event_id uuid, _segment text, _guests jsonb)` — validates ownership, inserts up to N rows per call with generated tokens and the shared `batch_id` + `segment`, returns created rows and skipped duplicates. Client chunks the file into batches of ~200 rows and shows progress.


**Parsing:** add `xlsx` (SheetJS) for `.xlsx` and CSV parsing in the browser; no file is uploaded to the server, only parsed rows.

**Email infrastructure:** set up app-email infrastructure (queue + worker) and scaffold the transactional email pipeline, plus a branded Spanish template `special-invite` (event cover, event name, date, place, guest name, big "Confirmar mi invitación" button pointing at `https://zentro.today/i/<token>`), matching Zentro's look (red #E60023, Poppins).

**Sending job:** a `send-special-invites` edge function takes an `event_id` + `batch_id`, walks pending rows, enqueues one email per guest with an idempotency key `special-invite-<invite_id>`, and updates `email_status`. Resume-safe: re-running only picks up rows still `not_sent`/`failed`.

**Front-end files:**
- `src/components/events/BulkInviteImportSheet.tsx` — segment name field, upload, preview, progress, results.
- `src/lib/inviteImport.ts` — CSV/XLSX parsing, header mapping, email validation, dedupe.
- `src/components/events/SpecialInvitesPanel.tsx` — import button, segment filter chips, search box, virtualized list, status chips, resend, export CSV, bulk revoke.
- `src/hooks/useSpecialInvites.ts` — hooks for bulk create, send batch, resend one, export; expose `segment`.
- `src/pages/YouAreGoing.tsx` — render "INVITADO ESPECIAL - {segmento}" when the guestlist entry has a label.


## Out of scope

- Seat/area assignment (guests just confirm attendance).
- SMS / WhatsApp automated sending.
- Editing a guest's name or email after import (revoke and re-import instead).

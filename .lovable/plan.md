## Problem

For zoeesweaney's approved entry to "Evento pop-up de zentro", the DB row has `price = 0` (free event), `status = "approved"`, a valid `qr_code_token`, but `payment_status = "pending"` (a stale default). The Tickets page renders the "Pago Pendiente" badge based purely on `payment_status` and gates QR access via `paymentOk`, so a free approved ticket looks unpaid and the QR can't open.

## Fix — `src/pages/Tickets.tsx` only

Make free events bypass the `payment_status` check entirely. Price is the source of truth for whether payment matters.

1. **`canShowQr`**: change to `canShowQr = !!ticket.qr_code_token && (isFree || paymentOk)`. Free + approved + has token → always allowed.
2. **Badge**: pass `isFree` into `getPaymentStatusBadge` (or branch inline). When `isFree`, always render the green **"Confirmado"** pill and skip the pending/rejected branches.
3. Leave paid-ticket logic untouched: paid tickets still show pending/rejected/confirmed based on `payment_status` and still tap-through to `/going/:id`.

No DB changes, no changes to `YouAreGoing.tsx` or backend.

## Result

Zoe's row will show **Confirmado** + working **Ver QR** dialog. Any other free approved ticket with a lingering `payment_status = "pending"` is also corrected client-side.

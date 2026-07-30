## What's happening

Your friend's redemption failed inside the database, not in the UI. The invite row is still `pending`, so nothing was consumed.

Cause (verified): the `redeem_special_invite` function runs with its search path limited to `public`, but it generates the ticket QR token with `gen_random_bytes(...)`, which lives in the `extensions` schema on this database. The call can't be resolved, the function raises an error that doesn't match any of the known invite error codes, and the app falls back to the generic "No se pudo aceptar la invitación".

This affects every redemption for a user who isn't already on the guestlist, so no invite link can currently be accepted.

## Fix

One migration that replaces `redeem_special_invite` with an identical body except:

- Generate the QR token in a way that resolves regardless of schema layout — use `replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')` (built-in in PG13+) instead of `gen_random_bytes`.
- Widen the function's search path to `public, extensions` so any other extension helper also resolves.

No frontend changes are needed; the existing error mapping and CTA flow stay as they are.

## Verification

- Re-run the redemption path for the outstanding pending invite on the test event and confirm: a `guestlist_entries` row is created with `is_special_guest = true`, `status = approved`, a non-null `qr_code_token`, and the invite flips to `redeemed`.
- Confirm re-tapping the same link by the same user is still idempotent (no duplicate entry, no error).
- Confirm the ticket screen shows the "Invitado especial" badge.

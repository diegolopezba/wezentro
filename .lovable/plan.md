# Fix: no confirmation email after buying a ticket

## Root cause (confirmed)

`send-purchase-tickets` looks up buyer/guest addresses with:

```
.from('profiles').select('id, full_name, username, email')
```

but the `profiles` table has **no `email` column** (verified against the database — the query errors with `column profiles.email does not exist`). The select fails, the profile map ends up empty, and the function returns without sending anything. That matches the email log: there is not a single `tickets-purchased` row, while `waitlist-released`, `reservation-*` and `special-invite` emails have been sent successfully.

The payment path itself is fine: today's confirmed purchase session exists and `qhantuy-callback` does call `send-purchase-tickets` (the function is deployed and reachable).

## The fix

1. In `supabase/functions/send-purchase-tickets/index.ts`, resolve addresses the same way the working functions do (`send-reservation-emails`, `send-experience-emails`): read `id, full_name, username` from `profiles`, then get each address via `auth.admin.getUserById(id)` and merge into the profile map.
2. Redeploy `send-purchase-tickets`.
3. Add a guard: if no recipient address can be resolved, log an explicit error instead of silently returning `sent: 0`.

## Free tickets

Free / Bs. 0 tickets and "Confirmar entrada gratis" joins never go through `qhantuy-callback`, so they get no email at all today. I'll also dispatch `send-purchase-tickets` (or an equivalent free-entry send) on that path so every confirmed ticket — paid or free — gets its QR by email.

## Verification

- Re-send for the already-confirmed purchase session and confirm a `tickets-purchased` row appears in the email log with status `sent`.
- Buy one paid ticket and confirm one free ticket end to end, checking the buyer inbox and the email log for both.
- Also confirm experience booking emails now land, since they share the same dispatch shape.

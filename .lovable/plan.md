## What I verified

- The event you were testing (`prueba 4`) is priced Bs. 2, has no ticket tiers, and its creator does have an active payment beneficiary — so the checkout *should* work.
- No payment session rows were created at the time of your test, and the QR function shows boot activity but no error logs. That means the function returned early (before creating the session) on one of its silent early-exit branches: unauthorized, event/tier not found, tier sold out, no price, or beneficiary missing.
- The UI can't tell us which one: `supabase.functions.invoke` throws on any non-2xx and discards the JSON body, so every one of those causes shows the same generic "Edge Function returned a non-2xx status code".

So the exact cause is not yet confirmed. Step 1 of the plan is to make the failure legible, then fix it.

## Plan

1. **Surface the real error in the client** (`src/components/events/PaymentQRModal.tsx`)
   - When `invoke` returns a `FunctionsHttpError`, read `error.context.json()` and show the server's Spanish message ("El organizador aún no configuró sus pagos", "Entradas agotadas", "Inicia sesión de nuevo", etc.) instead of the raw SDK string.
   - Keep the retry button; add the technical detail in a small muted line for debugging.

2. **Log every early return in the QR function** (`supabase/functions/generate-qhantuy-qr/index.ts`)
   - Add a `console.error` with eventId / tierId / promoterId / reason on each non-2xx path so the logs pinpoint the branch.
   - Return stable Spanish messages for each case.

3. **Harden promoter attribution in the function**
   - Validate `promoterId` against `event_promoters` for that event; if it's stale, unknown, or belongs to another event, drop it and continue the purchase instead of letting the session insert fail. A bad referral code must never block a sale.
   - Same treatment for a stale attribution stored in localStorage on the client.

4. **Auth-token edge case**
   - If `auth.getUser()` fails, respond 401 with a clear message and have the modal prompt re-login rather than showing a generic failure — this covers opening a promoter link in a browser where the session is stale (e.g. Safari vs. the installed PWA).

5. **Re-test end to end**
   - Deploy, open the promoter link, run "Comprar" → "Pagar con QR", and read the function logs to confirm either a successful QR or the precise branch that fails, then fix that specific cause.

## Note on environments

Your screenshot is on the published site (zentro.today). If the published app runs against the live backend while my inspection covered the test backend, a missing beneficiary/promoter record on live is a strong candidate for the failure. Step 2's logging will confirm this immediately after deploy.

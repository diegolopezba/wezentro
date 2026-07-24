## Root cause

The Qhantuy edge function returned 400 with a real message but our client shows only the generic `"non-2xx status code"`. The actual response (from function logs) was:

> "Ya existe un beneficiario registrado con el número de cédula de identidad '6244221'."

Qhantuy enforces **globally-unique CI per merchant appkey**. Because we use a single Zentro merchant, any CI that was ever registered (including from earlier test accounts) is rejected forever, even when a different Zentro user tries to register with it. Combined with `supabase.functions.invoke` swallowing the JSON error body, the user sees an opaque failure with no way to recover.

The fix must (a) surface the real reason, and (b) recover automatically when the same person (same email) is re-registering, since that is the legitimate case for a user who deleted/switched accounts.

## Fix plan

### 1. Stop swallowing the Qhantuy error message
In `BusinessPaymentSettings.tsx`, `supabase.functions.invoke` throws a `FunctionsHttpError` on non-2xx and its `.message` is generic. Read the parsed body via `err.context?.json()` (or the returned `data` on 4xx) and surface `data.error` in the toast. Do the same for the delete flow.

### 2. Server-side "recover or claim" for duplicate-CI
In `supabase/functions/qhantuy-register-beneficiary/index.ts`, when Qhantuy responds with `process:false` **and** the message indicates the CI already exists:

1. Call the documented `POST /check-beneficiaries` (with `appkey`) to list every beneficiary under our merchant.
2. Find the row whose `ci_number` matches the submitted CI.
3. Compare its `email` (and optionally `first_name`+`last_name`) with the submitted values:
   - **Match** → adopt: insert into `qhantuy_beneficiaries` for this `user_id` using the returned `beneficiary_code` and fields, then return `{ ok:true, recovered:true }`. Also call `/edit-beneficiary` if any editable field differs, to keep Qhantuy in sync.
   - **No match** → return a clear 409 with a message like: `"Esta cédula ya está registrada en Qhantuy con otro titular. Verifica que el CI corresponda al titular de la cuenta bancaria o contacta soporte."`

### 3. New shared helper
Add `checkBeneficiaries()` in `supabase/functions/_shared/qhantuy.ts` that wraps `POST /check-beneficiaries` and returns the parsed `items` array. Reuse from register (and later from a support tool if needed).

### 4. Same treatment for edit
`qhantuy-edit-beneficiary` already surfaces `res.data?.message`; just ensure the frontend reads that message with the same `context.json()` extraction as (1) so users see it.

### 5. Small UX
- In the register form, show a helper line under the CI field: *"Debe ser el CI del titular de la cuenta bancaria."*
- On the "recovered" success path, toast `"Cuenta bancaria vinculada correctamente."`.

## Technical details

- `check-beneficiaries` URL: `https://empresa.qhantuy.com/external-api/check-beneficiaries`, POST, body `{ appkey }`, `X-API-Token` header. Response shape: `{ process, message, items: [{ beneficiary_code, first_name, last_name, ci_number, email, bank_id, account_number, account_type }, …] }`.
- CI comparison must be string-normalized (Qhantuy sometimes returns int, we store string).
- Duplicate detection: match on Qhantuy `message` containing `"Ya existe un beneficiario"` OR `errors` array containing `"cédula de identidad"`; do not rely on HTTP status.
- Do NOT auto-adopt without the email match — otherwise two Zentro users could route payouts to the same bank account.
- No database schema changes. No changes to checkout / QR flow.

## Files touched

- `supabase/functions/_shared/qhantuy.ts` — add `checkBeneficiaries()`.
- `supabase/functions/qhantuy-register-beneficiary/index.ts` — duplicate-CI recovery branch.
- `src/pages/BusinessPaymentSettings.tsx` — parse and display real edge-function error messages; CI helper text; recovered-toast copy.

## Verification

1. Register with a brand-new CI → succeeds (unchanged path).
2. Register a second Zentro account using the **same** CI + same email as an existing Qhantuy beneficiary → auto-recovers, row inserted, "Configurado" shown.
3. Register with a CI that exists in Qhantuy under a **different** email → clear Spanish error toast, no row inserted.
4. Trigger any other Qhantuy 4xx → toast shows the Qhantuy message, not "non-2xx status code".
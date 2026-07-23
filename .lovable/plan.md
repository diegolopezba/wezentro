## Root cause (confirmed from edge function logs)

`qhantuy-register-beneficiary` failed with Qhantuy's response:

```
{"status":false,"process":false,"message":"Error al enviar los datos.","errors":["El parámetro 'appkey' es obligatorio."]}
```

Qhantuy requires `appkey` to be sent **in the request body** (or as a form field), not only as an HTTP header. Our shared helper `supabase/functions/_shared/qhantuy.ts` currently sends `appkey` only as a header via `qhantuyAuthHeaders()`, so Qhantuy rejects the call.

## Fix

Update `supabase/functions/_shared/qhantuy.ts` so JSON POST bodies automatically include `appkey` (and keep sending it as a header too, for compatibility):

- In `qhantuyRawFetch`, when `init.method` is POST and `init.body` is a JSON string, parse it, inject `appkey: Deno.env.get("QHANTUY_APPKEY")`, and re-stringify.
- Leave GET requests untouched.

This one change fixes every Qhantuy call in the project (register/edit/delete beneficiary, list banks, generate QR, check status) without editing each function.

## Verification

1. Redeploy affected functions (all Qhantuy ones — they share the helper).
2. From the app, submit the beneficiary form again on `/settings/business/payments`.
3. Confirm success toast and that the row appears in `qhantuy_beneficiaries`.
4. Tail `qhantuy-register-beneficiary` logs to confirm no more "appkey" rejection.

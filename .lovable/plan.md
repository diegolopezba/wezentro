# Qhantuy Checkout Integration — Full Migration Plan

Replace the BNB QR system entirely with Qhantuy Checkout (production). Every business registers their bank account as a Qhantuy **beneficiary** through Zentro; ticket payments generate a QR via Qhantuy and payouts land in the business's bank next day automatically.

## What Qhantuy gives us (from the spec)

- **`POST /external-api/v2/checkout`** (`payment_method: "QRSIMPLE"`) → returns `transaction_id` + `image_data` (QR URL) synchronously. `internal_code` echoes back on the callback.
- **`GET callback_url`** hit by Qhantuy after payment with `transaction_id`, `payment_status`, `checkout_amount`, `checkout_currency`, `internal_code`, `profile_code`, `message`.
- **`POST /external-api/register-beneficiary`** (implicit — spec covers beneficiaries with `first_name`, `last_name`, `ci_number`, `email`, `bank_id`, `account_number`, `account_type`) → returns `beneficiary_code`.
- **`POST /external-api/edit-beneficiary`**, **`POST /external-api/check-beneficiaries`**, **`POST /external-api/delete-beneficiary`**.
- **`GET /external-api/check-bank`** → list of banks with IDs (needed to populate a dropdown).
- **`custom_payouts`** on checkout: `[{ code: <beneficiary_code>, amount: <full price> }]` routes 100% of the sale to that beneficiary — this is how each business gets paid the next day.
- Auth: header `X-API-Token` (Zentro-wide) + `appkey` (Zentro-wide, single merchant, per spec).

## Scope

### 1. Secrets (via `add_secret`)
- `QHANTUY_API_TOKEN` — production `X-API-Token` header.
- `QHANTUY_APPKEY` — production 64-char appkey.

Both routed through Lovable Cloud secrets; used only in edge functions.

### 2. Database migration

**New table `qhantuy_beneficiaries`** (one per business, holds Qhantuy's returned code + display copy)
- `user_id uuid pk` → business owner
- `beneficiary_code text not null unique` (returned by Qhantuy)
- `first_name`, `last_name`, `ci_number`, `email`, `bank_id int`, `bank_name text`, `account_number text`, `account_type text`
- `is_active bool default true`, timestamps
- RLS: owner reads/writes own row; service_role full access.
- Standard `GRANT SELECT/INSERT/UPDATE/DELETE … TO authenticated; GRANT ALL … TO service_role`.

**Alter `payment_sessions`**
- Add `qhantuy_transaction_id bigint`, `qhantuy_raw_callback jsonb`, `beneficiary_code text` (audit which beneficiary got paid).
- Drop BNB-specific columns (`bnb_qr_id`, etc.) once the code path is removed.

**Drop `business_payment_settings`** (BNB-only) after code migration; replaced by `qhantuy_beneficiaries`.

**Drop unused BNB DB functions/policies** referenced only by BNB flow.

### 3. Edge functions

Add all four to `supabase/config.toml` with `verify_jwt = false` (JWT validated in code where needed).

- **`qhantuy-list-banks`** — proxies `GET /external-api/check-bank`; caches for 24h in memory. Called from onboarding to render bank dropdown.
- **`qhantuy-register-beneficiary`** — authenticated. Accepts `{ first_name, last_name, ci_number, email, bank_id, account_number, account_type }`, validates with Zod, calls Qhantuy, upserts `qhantuy_beneficiaries` row with returned `beneficiary_code`.
- **`qhantuy-edit-beneficiary`** — authenticated. Same payload plus `beneficiary_code`. Calls Qhantuy edit endpoint, updates our row.
- **`qhantuy-delete-beneficiary`** — authenticated. Removes both remote + local rows.
- **`generate-qhantuy-qr`** — authenticated buyer. Loads event → tier → price → creator's `beneficiary_code`. If missing → 400 "El organizador aún no configuró sus pagos". Inserts `payment_sessions` row (`status='pending'`, `provider='qhantuy'`) and uses its id as `internal_code`. POSTs to Qhantuy checkout with `payment_method:"QRSIMPLE"`, `image_method:"URL"`, `items:[{name: tier.name, quantity:1, price: amount}]`, `custom_payouts:[{code: beneficiary_code, amount: fullAmount}]`, `callback_url: <project>.supabase.co/functions/v1/qhantuy-callback`. Persists `qhantuy_transaction_id`. Returns `{ paymentSessionId, qrImageUrl, amount, eventTitle }`.
- **`qhantuy-callback`** — GET handler. Looks up session by `internal_code` AND `qhantuy_transaction_id`. Verifies `payment_status === 'success'` AND `checkout_amount === session.amount` AND `checkout_currency === 'BOB'`. Idempotent. On success: mark `status='paid'`, stamp `paid_at`, `qhantuy_raw_callback`, `beneficiary_code`, run existing post-payment side-effects (increment `sold_count`, notifications, promoter attribution). Returns 200 plain text OK.
- **`check-qhantuy-payment-status`** — buyer polls this every 3s. Reads session; if still pending, calls Qhantuy CONSULTA DE DEUDA with `transaction_id` as safety-net reconciliation. Returns `{ status }`.

### 4. Frontend

**Replace `BusinessPaymentSettings.tsx`** with a Qhantuy beneficiary onboarding page:
- If no beneficiary → "Configura tu cuenta bancaria" form: first name, last name, CI, email, bank (dropdown from `qhantuy-list-banks`), account number, account type (Ahorros / Corriente).
- Submit → `qhantuy-register-beneficiary`. Success toast + status pill "Configurado — los pagos llegarán a tu cuenta al día siguiente".
- If beneficiary exists → show summary (bank + last 4 of account) with **Editar** / **Eliminar** actions.
- Copy: "Los pagos por tickets vendidos en Zentro se depositan automáticamente en tu cuenta bancaria vía Qhantuy al día hábil siguiente."

**`PaymentQRModal.tsx`** — simplify to Qhantuy only: renders QR from image URL, polls `check-qhantuy-payment-status`. Remove all BNB branches.

**Ticket flow** — swap the `generate-bnb-qr` call to `generate-qhantuy-qr` in whichever hook triggers ticket purchase; keep the same success UX.

**Gate**: if a business has no beneficiary configured, hide ticket purchase / show "El organizador aún no habilitó pagos" on paid events.

### 5. BNB cleanup (final, same pass)
- Delete edge functions: `generate-bnb-qr`, `check-bnb-payment-status`. Remove their entries from `supabase/config.toml`.
- Delete `business_payment_settings` table.
- Remove all `bnb_*` fields on `payment_sessions`.
- Remove any BNB copy from settings, help pages, and email templates.

## Out of scope
- CYBERSOURCE (card) / DEPOSITOBCP / T2P payment methods.
- Multi-beneficiary splits (e.g. commissions to promoters via `custom_payouts`) — architecture supports it later, but this pass sends 100% to the event organizer.
- Refunds/chargebacks (not covered in the spec you shared).
- Sandbox environment — going straight to production per your confirmation.

## Technical details
- Amount validation on callback: reject if `Number(checkout_amount) !== session.amount` to prevent spoofed callbacks (the `internal_code` UUID is unguessable, but we double-check).
- `X-API-Token` and `QHANTUY_APPKEY` only ever read inside edge functions — never exposed to the client.
- Bank list cached in-memory per cold-start to avoid hammering Qhantuy.
- `beneficiary_code` stored per-business is what actually authorizes the payout routing on every ticket sale; no per-event configuration needed.
- All prices sent as BOB integers matching current tier price handling.
- Full CORS headers on every function (matches existing project standard).
- All new tables/columns follow the project's grant + RLS pattern.

## Open question before build
The spec I have doesn't include the exact URL for `register-beneficiary` (only `edit`, `list`, `delete` are shown explicitly). I'll assume `https://empresa.qhantuy.com/external-api/register-beneficiary` by convention from the sibling endpoints. If Qhantuy gave you a different URL for beneficiary registration, share it before build so I wire it correctly on the first pass.

## Current state

Backend edge functions and database migration are written; frontend pages are migrated; build passes; Qhantuy secrets are already stored. A quick scan shows three small items still outstanding before the integration is fully live.

## Remaining work

### 1. Deploy the new Qhantuy edge functions
The following functions are registered in `supabase/config.toml` but need to be deployed to the project:

- `qhantuy-list-banks`
- `qhantuy-register-beneficiary`
- `qhantuy-edit-beneficiary`
- `qhantuy-delete-beneficiary`
- `generate-qhantuy-qr`
- `qhantuy-callback`
- `check-qhantuy-payment-status`

### 2. Update legal / policy copy from BNB to Qhantuy
`src/pages/TermsOfUse.tsx` and `src/pages/PrivacyPolicy.tsx` still describe the old BNB Open Banking flow. Update them to describe Qhantuy:

- Replace "BNB Open Banking" with "Qhantuy"
- Update the registration/credential description to match Qhantuy beneficiary setup
- Update the payout description (next-day automatic payout to the organizer's bank account)
- Keep the same legal intent: Zentro does not hold funds; money goes directly to the business

### 3. End-to-end smoke test
After deployment, verify:

- A business can register a beneficiary on `/settings/business/payments`
- The bank list loads in the dropdown
- A buyer can open an event, select a ticket tier, and generate a QR
- The QR payload points to the Qhantuy checkout URL
- The callback endpoint records a completed payment and creates the guestlist entry
- The status-poller correctly transitions from `pending` to `paid`/`failed`

## Out of scope (already done)

- Database schema migration
- Edge function code
- Frontend UI migration (`BusinessPaymentSettings`, `PaymentQRModal`, `BusinessSettings`, `EventDetail`)
- Secret storage (`QHANTUY_API_TOKEN`, `QHANTUY_APPKEY`)

## Acceptance criteria

- All 7 Qhantuy functions respond successfully via `supabase--curl_edge_functions`
- No "BNB" references remain in user-facing pages
- A test payment flow completes from QR generation through callback
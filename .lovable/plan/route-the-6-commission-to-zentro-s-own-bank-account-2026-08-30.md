# Route the 6% commission to Zentro's own bank account

## What is happening today

Every checkout (tickets and experiences) builds a single payout instruction:

```text
custom_payouts: [ { code: <organizer beneficiary>, amount: 94% } ]
```

The 6% commission is never assigned to anyone. It stays inside the Qhantuy
merchant account and settles by Qhantuy's default rule for the uncovered
remainder — which, in the tests you ran, ended up with the organizer rather
than with Zentro. Yes, `custom_payouts` is already in use, just with a single
entry; the fix is to add Zentro's own beneficiary as a second payout line.

## Zentro beneficiary details (provided)

```text
Titular:  Gerardo Diego Lopez Barrientos
CI:       6244221
Banco:    Banco Mercantil Santa Cruz
Cuenta:   1007026017
Tipo:     Caja de Ahorro
```

## Plan

1. Register Zentro's bank account as a Qhantuy beneficiary
  - Look up Banco Mercantil Santa Cruz's `bank_id` via `qhantuy-list-banks`.
  - Register the beneficiary through Qhantuy's `create-beneficiary` API
  (same endpoint `qhantuy-register-beneficiary` already wraps). If the CI
  already exists under our merchant, adopt the existing beneficiary code
  (the function already has that duplicate-CI recovery path).
  - An email is required by Qhantuy for the beneficiary; I'll use  
  [diegolopezzin@gmail.com](mailto:hello@zentro.com) unless you prefer another one.
  - Store the resulting beneficiary code as a backend secret
  (`QHANTUY_PLATFORM_BENEFICIARY_CODE`). It is never exposed to the app.
  - These bank details are used only for this one-time registration call;
  they are not written to the codebase or the database beyond what the
  beneficiary registration already stores.
2. Send an explicit two-way split on every checkout
  - In the shared Qhantuy helper (`_shared/qhantuy.ts`), add a function that
   returns both payout lines. In `generate-qhantuy-qr` and
   `generate-experience-qr`, replace the single payout with:

```text
custom_payouts: [
  { code: <organizer beneficiary>, amount: 94% },
  { code: <zentro beneficiary>,    amount: 6%  }
]
```

- Guard: if the platform beneficiary secret is missing, or the commission
rounds to 0, fall back to the current single-payout behaviour and log a
warning rather than blocking the sale.
- Rounding: the two amounts must always sum exactly to the charged total;
the commission line absorbs the rounding remainder.

3. Verify
  - Run one live paid ticket purchase and one experience booking, then check
   the Qhantuy transaction detail shows two payout lines with the right
   amounts and the right destination accounts, and that `payment_sessions`
   records match.

## Technical notes

- Files touched: `supabase/functions/_shared/qhantuy.ts`,
`supabase/functions/generate-qhantuy-qr/index.ts`,
`supabase/functions/generate-experience-qr/index.ts`.
- No database schema change. `payment_sessions.platform_fee_amount` /
`payout_amount` already record the split correctly, so dashboards and the
net figures shown to organizers stay as they are.
- Free tickets and Bs. 0 tiers never reach this code path.
- Edge functions redeployed at the end: `generate-qhantuy-qr`,
`generate-experience-qr` (and `_shared` rides along with each).
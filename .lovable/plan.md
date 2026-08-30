# Route the 6% commission to Zentro's own bank account

## What is happening today

Every checkout (tickets and experiences) builds a single payout instruction:

```text
custom_payouts: [ { code: <organizer beneficiary>, amount: 94% } ]
```

The 6% commission is never assigned to anyone. It is simply the part of the
payment that is not covered by a payout instruction, so it stays inside the
Qhantuy merchant account and is settled according to Qhantuy's default rule for
the remainder — which, in the tests you ran, ended up with the organizer rather
than with Zentro.

Note: the exact settlement rule for the uncovered remainder is not something the
code can prove, so step 1 below confirms it with Qhantuy before changing the
split.

## Plan

1. Confirm the remainder behaviour
   - Read the current beneficiary list from Qhantuy (`check-beneficiaries`) and
     the settlement record for one of the test payments, to confirm the
     uncovered 6% is being paid to the organizer.

2. Register Zentro's bank account as a beneficiary
   - Zentro's own account must exist as a Qhantuy beneficiary to receive a
     payout. If it is not registered yet, register it once (same data a business
     provides: name, CI/NIT, bank, account number, account type).
   - Store the resulting beneficiary code as a backend secret
     (`QHANTUY_PLATFORM_BENEFICIARY_CODE`). It is not stored per-user and is not
     exposed to the app.

3. Send an explicit two-way split on every checkout
   - In the shared Qhantuy helper, add a function that returns both payout
     lines. In `generate-qhantuy-qr` and `generate-experience-qr`, replace the
     single payout with:

```text
custom_payouts: [
  { code: <organizer beneficiary>, amount: 94% },
  { code: <zentro beneficiary>,    amount: 6%  }
]
```

   - Guard: if the platform beneficiary code is missing, or the commission
     rounds to 0, fall back to the current single-payout behaviour and log a
     warning rather than blocking the sale.
   - Rounding: the two amounts must always sum exactly to the charged total; the
     commission line absorbs the rounding remainder.

4. Verify
   - Run one live paid ticket purchase and one experience booking, then check the
     Qhantuy transaction detail shows two payout lines with the right amounts and
     the right destination accounts, and that `payment_sessions` records match.

## Technical notes

- Files touched: `supabase/functions/_shared/qhantuy.ts`,
  `supabase/functions/generate-qhantuy-qr/index.ts`,
  `supabase/functions/generate-experience-qr/index.ts`.
- No database schema change. `payment_sessions.platform_fee_amount` /
  `payout_amount` already record the split correctly, so dashboards and the net
  figures shown to organizers stay as they are.
- Free tickets and Bs. 0 tiers never reach this code path.

## What I need from you

Zentro's bank details for the platform beneficiary (account holder name, CI/NIT,
bank, account number, account type) — or the existing beneficiary code if that
account is already registered in Qhantuy.

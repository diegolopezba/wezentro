## Bug

On the Create page, after a business user has already registered their Qhantuy bank details, the "Configura tus datos de cobro" gate keeps showing when they try to set a price.

## Root cause (verified)

`src/hooks/useHasBeneficiary.ts` runs:

```ts
supabase.from("qhantuy_beneficiaries").select("id")...
```

But the `qhantuy_beneficiaries` table has no `id` column — its columns are `user_id, beneficiary_code, first_name, last_name, ci_number, email, bank_id, bank_name, account_number, account_type, is_active, created_at, updated_at` (verified via schema query). PostgREST returns an error, React Query stores no data, and the hook resolves `hasBeneficiary` to `false` forever — even though the row exists (confirmed in the network log: the `/qhantuy_beneficiaries?select=beneficiary_code,...` request returns the user's beneficiary successfully).

That's why `TicketTiersEditor` receives `onAttemptPaidAction`, locks itself, and pops the Beneficiary sheet.

## Fix

Single-line change in `src/hooks/useHasBeneficiary.ts`: select an existing column instead of `id`.

- Change `.select("id")` → `.select("user_id")`.
- Everything else (`enabled`, `maybeSingle`, `!!data`, `staleTime`) stays as-is.
- The existing `queryClient.invalidateQueries({ queryKey: ["qhantuy-beneficiary", user?.id] })` calls in `BusinessPaymentSettings.tsx` will then correctly flip the flag to `true` right after save.

No other files need to change. Create and Edit flows both consume this hook, so both are fixed by the same edit.

## Verification

- Reload `/create` as the business account that already has a beneficiary → price input becomes editable, no gate on focus.
- Delete beneficiary on `/settings/business/payments` → returning to `/create` re-locks the price input and shows the gate.

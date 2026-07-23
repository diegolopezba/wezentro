## Goal
Restrict paid tickets to Business accounts with registered Qhantuy beneficiary details. Anyone can create free events/posts.

## Rules
1. Non-business user tries to set a price > 0 (single or tier) → show **"Business required"** bottom-sheet gate.
2. Business user without a Qhantuy beneficiary tries to set a price → show **"Beneficiary required"** bottom-sheet gate.
3. Business user with beneficiary → normal paid flow.
4. Applies to both `Create.tsx` and `EditEventSheet.tsx`.

## Implementation

### 1. New hook `src/hooks/useHasBeneficiary.ts`
Reads `qhantuy_beneficiaries` for `auth.uid()`, returns `{ hasBeneficiary, isLoading }`.

### 2. New bottom sheets (in `src/components/events/`)
- `BusinessRequiredSheet.tsx` — explains Business account benefits (guestlists, dashboard, menu, reservations, paid tickets) with primary CTA "Activar cuenta Business" → navigates to `/settings/business`. Also acts as the Business onboarding explainer.
- `BeneficiaryRequiredSheet.tsx` — explains why beneficiary details are needed (Qhantuy next-day payout) with CTA "Configurar cobros" → `/settings/business/payments`.

Both follow existing `vaul` bottom-sheet pattern (like `PaymentsComingSoonSheet`), no close button, drag-to-dismiss, `px-4`, brand red pill CTA.

### 3. Gate logic in `TicketTiersEditor` / price inputs
In `Create.tsx` and `EditEventSheet.tsx`:
- Wrap the price input `onChange` and the "tiers" mode toggle with a gate check:
  - If `!isBusiness` → open `BusinessRequiredSheet`, block change (keep price "0" / stay in single mode).
  - Else if `!hasBeneficiary` → open `BeneficiaryRequiredSheet`, block change.
- Gate fires on first attempt to enter a non-zero price or switch to tiers mode.
- Also enforce at submit: reject paid values with the same sheet.

### 4. Remove the temporary "payments coming soon" gate
The `attemptedPrice / attemptedTiers → setShowPaymentsSoon(true)` block in `Create.tsx` (lines 307-313) is now superseded — replace with the new gates. Same for any equivalent in edit flow. Keep `PaymentsComingSoonSheet.tsx` file untouched for now (unused, no deletions per prior instruction).

### 5. Wiring
- Pass `isBusiness` and `hasBeneficiary` into `TicketTiersEditor` OR handle gating in the parent before values propagate (simpler — parent-level guard). Prefer parent-level guard so the editor stays presentational.

## Technical notes
- `hasBeneficiary` check = `select id from qhantuy_beneficiaries where user_id = auth.uid() limit 1`.
- Cache with React Query, invalidate after successful beneficiary registration in `BusinessPaymentSettings.tsx`.
- Free events (price = 0) remain unrestricted for everyone.

## Out of scope
- No schema changes.
- No changes to Qhantuy edge functions.
- No deletion of unused files.

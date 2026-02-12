

## Bug: Zentro Places upgrade saved as Zentro Premium

### Root Cause

The `create-checkout-session` function uses **newer** Stripe price IDs that belong to **newer** product IDs, but the `stripe-webhook` and `check-subscription` functions still only map the **old** product IDs. When the webhook can't find the product in its mapping, it falls back to `"user_premium"` -- which is why your Pasta Basta account shows as Zentro Premium instead of Zentro Places.

Here's the mismatch:

| Plan | Price ID (checkout) | Actual Product | Webhook/Check mapping |
|------|---|---|---|
| user_premium | `price_1SvllRA2meaZKvFR6VtGyv2N` | `prod_TtYt9Jw1TmrMds` (new) | Only knows `prod_Td3jVaQwDP8Fdz` (old) |
| food_premium | `price_1Ss5E4A2meaZKvFRefWcJ9Zb` | `prod_TpkjEVW1gDfv9h` (new) | Only knows `prod_Toxvk2koMWuN0w` (old) |
| business_premium | `price_1SfndIA2meaZKvFRdZTDttRv` | `prod_Td3kU1JBlekyrO` | Correct |

### Fix

Update the `PRODUCT_TO_PLAN` mapping in **two** edge functions to include both old and new product IDs:

**1. `supabase/functions/stripe-webhook/index.ts`** (line 16-20)

Update the mapping to:
```typescript
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Td3jVaQwDP8Fdz": "user_premium",
  "prod_TtYt9Jw1TmrMds": "user_premium",      // new product
  "prod_Td3kU1JBlekyrO": "business_premium",
  "prod_Toxvk2koMWuN0w": "food_premium",        // fix: was "places_premium"
  "prod_TpkjEVW1gDfv9h": "food_premium",        // new product
};
```

Note: the old food product was also mapped to `"places_premium"` instead of `"food_premium"` -- that's a second bug that would have caused the same issue.

**2. `supabase/functions/check-subscription/index.ts`** (line 16-19)

Update the mapping to:
```typescript
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Td3jVaQwDP8Fdz": "user_premium",
  "prod_TtYt9Jw1TmrMds": "user_premium",      // new product
  "prod_Td3kU1JBlekyrO": "business_premium",
  "prod_Toxvk2koMWuN0w": "food_premium",
  "prod_TpkjEVW1gDfv9h": "food_premium",        // new product
};
```

**3. Fix "Pasta Basta" account**

After deploying, hit "Actualizar Estado" on the Subscription page (or re-login) -- the `check-subscription` function will re-read the Stripe subscription with the corrected mapping and update the database to `food_premium`.

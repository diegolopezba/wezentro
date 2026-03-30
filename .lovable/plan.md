

## Plan: Fix Ad Boost Payment Flow

### Changes

**1. Delete dead `create-ad-checkout` function**
- Delete `supabase/functions/create-ad-checkout/index.ts`
- Remove `[functions.create-ad-checkout]` from `supabase/config.toml`

**2. Fix native Capacitor return from Stripe Checkout**
In `PromocionesSection.tsx`, after `Browser.open()`:
- Add `Browser.addListener('browserFinished')` listener
- When browser closes, refetch sponsored posts
- If the campaign status changed to `active`, show success toast
- Clean up listener on unmount

**3. Fix CORS headers on all 3 remaining ad functions**
Update `corsHeaders` in `charge-boost`, `activate-ad-campaign`, and `stripe-webhook` to include the full set:
```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

**4. Prevent free unpause after budget exhaustion**
In `useUpdateSponsoredStatus` mutation, before setting status to `active`, check if `spent >= total_budget`. If so, block the toggle and show a toast telling the user to add more budget. This is a frontend guard; the DB function `increment_sponsored_impressions` is the server-side safety net.

### Files affected

| File | Action |
|---|---|
| `supabase/functions/create-ad-checkout/index.ts` | Delete |
| `supabase/config.toml` | Remove create-ad-checkout block |
| `src/components/dashboard/PromocionesSection.tsx` | Add browserFinished listener for native return |
| `supabase/functions/charge-boost/index.ts` | Fix CORS headers |
| `supabase/functions/activate-ad-campaign/index.ts` | Fix CORS headers |
| `supabase/functions/stripe-webhook/index.ts` | Fix CORS headers |
| `src/hooks/useSponsoredPosts.ts` | Add budget-exhaustion guard to toggle |


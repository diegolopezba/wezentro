

# Phase 1: Database + Subscription Restructuring

## Overview
Remove Zentro Places ($12.99) and Zentro Business ($29.99) paid tiers. Make all business features free (controlled by existing `profiles.is_business` flag). Keep only Zentro Premium at $1.99/month. Create `sponsored_posts` table for future ad revenue.

---

## Step 1: Database Migration

Create `sponsored_posts` table with the following columns:
- `id` (uuid, PK)
- `event_id` (uuid, FK to events)
- `business_user_id` (uuid, references profiles)
- `status` (text: draft/active/paused/completed, default 'draft')
- `daily_budget` (numeric, nullable)
- `total_budget` (numeric, nullable)
- `spent` (numeric, default 0)
- `start_date` (timestamptz, nullable)
- `end_date` (timestamptz, nullable)
- `impressions` (integer, default 0)
- `clicks` (integer, default 0)
- `created_at` (timestamptz, default now())

RLS policies:
- Business owners can CRUD their own rows
- All authenticated users can SELECT active sponsored posts (for feed display)

---

## Step 2: Simplify Subscription Plans

**File: `src/hooks/useSubscription.ts`**
- Remove `food_premium` and `business_premium` from `useSubscriptionPlans()` -- keep only "Gratis" and "Zentro Premium" ($1.99)
- Update `getPlanDisplayName()` to remove old plan names
- Remove `food_premium` and `business_premium` cases

**File: `src/pages/Subscription.tsx`**
- Will automatically simplify since it reads from `useSubscriptionPlans()`
- Remove `UtensilsCrossed` and `Crown` icon logic for removed plans

---

## Step 3: Update Edge Functions

**`supabase/functions/create-checkout-session/index.ts`**
- Remove `food_premium` and `business_premium` from `PRICE_IDS`
- Keep only `user_premium` with the existing price ID
- Remove trial period (or keep -- your choice)

**`supabase/functions/check-subscription/index.ts`**
- Remove `food_premium` and `business_premium` product mappings from `PRODUCT_TO_PLAN`
- Keep only user_premium product IDs

**`supabase/functions/stripe-webhook/index.ts`**
- Same cleanup of `PRODUCT_TO_PLAN` mapping
- Remove `BUSINESS_PLANS` constant (no longer needed for referral rewards distinction)

---

## Step 4: Replace Subscription Gates with `is_business` Flag (~12 files)

All checks like `subscription?.plan_type === "business_premium"` become `profile?.is_business === true`.

| File | Current Check | New Check |
|------|--------------|-----------|
| `src/pages/Create.tsx` | `hasBusinessSubscription` | `profile?.is_business` |
| `src/pages/Profile.tsx` | `isFoodBusiness`, `isBusinessAccount` | `profile?.is_business` |
| `src/pages/EditProfile.tsx` | `isFoodSubscriber`, `isBusinessSubscriber` | `profile?.is_business` |
| `src/pages/Settings.tsx` | `subscription?.plan_type === "business_premium"` | `profile?.is_business` |
| `src/pages/BusinessDashboard.tsx` | `subscription?.plan_type === "business_premium"` | `profile?.is_business` |
| `src/pages/UserProfile.tsx` | subscription-based badge | `is_business` flag from profile |
| `src/components/events/EditEventSheet.tsx` | `hasBusinessSubscription` | `profile?.is_business` (via auth context) |
| `src/components/events/ShareEventModal.tsx` | `subscription?.plan_type === 'business_premium'` | `profile?.is_business` |
| `src/components/events/ShareGuestlistModal.tsx` | same | same |
| `src/components/subscription/SubscriptionUpsellModal.tsx` | Shows "subscribe to Business" | Repurpose to "Switch to Business Account (free)" |
| `src/hooks/useFoodLocations.ts` | Checks `food_premium` subscription | Check `is_food_business` flag on profile |

---

## Step 5: Add Business Toggle in Settings

**File: `src/pages/Settings.tsx`**
- Add a "Cuenta Business" section with a Switch component
- When toggled ON: updates `profiles.is_business = true` and optionally `is_food_business`
- Brief explanation text: "Accede a guestlists, dashboard, menú y reservas -- gratis"
- No subscription needed

---

## Step 6: Update Profile Badges

**File: `src/pages/Profile.tsx`**
- Premium badge (crown) shown for `user_premium` subscribers
- Business badge (briefcase icon) shown for `is_business` accounts
- Food business badge (utensils) shown for `is_food_business` accounts
- These are independent -- a user can be both Premium AND Business

---

## Technical Details

### Files to modify (in order):
1. Database migration (sponsored_posts table)
2. `src/hooks/useSubscription.ts` (simplify plans)
3. `supabase/functions/create-checkout-session/index.ts`
4. `supabase/functions/check-subscription/index.ts`
5. `supabase/functions/stripe-webhook/index.ts`
6. `src/pages/Settings.tsx` (add business toggle)
7. `src/pages/Create.tsx` (replace subscription check)
8. `src/pages/Profile.tsx` (replace subscription checks)
9. `src/pages/EditProfile.tsx` (replace subscription checks)
10. `src/pages/BusinessDashboard.tsx` (replace subscription check)
11. `src/pages/UserProfile.tsx` (update badge logic)
12. `src/components/events/EditEventSheet.tsx` (replace subscription check)
13. `src/components/events/ShareEventModal.tsx` (replace check)
14. `src/components/events/ShareGuestlistModal.tsx` (replace check)
15. `src/components/subscription/SubscriptionUpsellModal.tsx` (repurpose)
16. `src/hooks/useFoodLocations.ts` (check profile flag instead of subscription)
17. `src/pages/Subscription.tsx` (simplified UI)

### What stays the same:
- Zentro Premium subscription flow (Stripe checkout, webhooks)
- Premium gate for joining guestlists (`PremiumGateModal`)
- All existing database tables (events, guestlists, menus, reservations)
- `profiles.is_business` and `profiles.is_food_business` flags already exist

### Sponsored posts feed integration will be a separate follow-up phase after this restructuring is complete.


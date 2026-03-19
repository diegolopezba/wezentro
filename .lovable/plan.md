
## Remove Subscription / Make Everything Free

### Goal
Strip out all paywall logic so every registered user gets full access to guestlists, messaging, and any other "premium" feature — with zero Stripe checkout involved. Keep the codebase clean. The Stripe/subscription infrastructure can stay dormant in the backend for a future return.

---

### What subscription currently gates

1. **Guestlist join** — `handleJoinGuestlist` in `useEventDetailState.ts` checks `hasSubscription`; if false, shows `PremiumGateModal` instead of joining.
2. **RLS policy** — `guestlist_entries` table has policy: `"Premium users can join guestlists"` which requires `has_active_subscription(auth.uid())`. This blocks the DB insert for non-subscribers.
3. **PremiumGateModal** — the modal that appears offering the Stripe checkout.
4. **Profile page** — shows a `Crown` / "Premium" badge based on `isPremium`.
5. **UserProfile page** — same Crown badge shown on other users' profiles.
6. **Settings page** — has a "Suscripción" link item pointing to `/settings/subscription`.
7. **Referrals page** — reads `subscription?.plan_type` to check for old premium tiers.

---

### What to change

**1. Database migration — fix the RLS policy (most critical)**
The DB policy `"Premium users can join guestlists"` has `WITH CHECK: has_active_subscription(auth.uid())`. This blocks all non-subscribers at the DB level regardless of any frontend change. We need to replace it with a simple authenticated-user check:
```sql
DROP POLICY "Premium users can join guestlists" ON public.guestlist_entries;
CREATE POLICY "Authenticated users can join guestlists"
  ON public.guestlist_entries FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);
```

**2. `src/hooks/useEventDetailState.ts`**
- Remove `useHasActiveSubscription` import and usage
- In `handleJoinGuestlist`, remove the `if (!hasSubscription) { setShowPremiumGate(true); return; }` guard
- Remove `hasSubscription` from the returned object

**3. `src/hooks/useGuestlist.ts`**
- Remove the `useHasActiveSubscription` hook entirely (it's only used for the paywall check)

**4. `src/components/events/PremiumGateModal.tsx`**
- Delete the file (no longer needed anywhere)

**5. `src/components/events/EventDetailOverlay.tsx`** and **`src/pages/EventDetail.tsx`**
- Remove the `PremiumGateModal` import and usage (`showPremiumGate` state and the `<PremiumGateModal>` JSX block)
- Remove `showPremiumGate` / `setShowPremiumGate` from destructuring

**6. `src/pages/Profile.tsx`**
- Remove `useUserSubscription` import
- Remove `isPremium` variable
- Remove any Crown badge / "Zentro Premium" badge that shows based on `isPremium`

**7. `src/pages/UserProfile.tsx`**
- Remove `useUserSubscriptionById` import
- Remove `isPremium` variable
- Remove Crown badge that shows based on `isPremium`

**8. `src/pages/Settings.tsx`**
- Remove the `{ icon: CreditCard, label: "Suscripción", path: "/settings/subscription" }` item from the Personal section

**9. `src/pages/Referrals.tsx`**
- Remove `useUserSubscription` import
- Remove `isPlacesPremium` / `isBusinessPremium` variables (they referenced removed plan types and aren't used in the current UI)

**10. `src/App.tsx`**
- Remove the `/settings/subscription` and `/checkout-success` route entries
- Remove `Subscription` and `CheckoutSuccess` lazy imports

---

### Files NOT touched
- `supabase/functions/check-subscription`, `create-checkout-session`, `stripe-webhook` — left intact for future re-activation
- `src/hooks/useSubscription.ts` — left intact (dormant)
- `src/pages/Subscription.tsx` — left intact (route just removed)
- `src/pages/CheckoutSuccess.tsx` — left intact (route just removed)
- Backend `subscriptions` table — untouched

---

### Summary of files changed

| File | Change |
|------|--------|
| DB migration | Drop + replace guestlist RLS policy |
| `useEventDetailState.ts` | Remove subscription check in `handleJoinGuestlist` |
| `useGuestlist.ts` | Remove `useHasActiveSubscription` hook |
| `PremiumGateModal.tsx` | Delete |
| `EventDetailOverlay.tsx` | Remove PremiumGateModal usage |
| `EventDetail.tsx` | Remove PremiumGateModal usage |
| `Profile.tsx` | Remove premium badge |
| `UserProfile.tsx` | Remove premium badge |
| `Settings.tsx` | Remove Subscription menu item |
| `Referrals.tsx` | Remove subscription imports |
| `App.tsx` | Remove subscription routes |

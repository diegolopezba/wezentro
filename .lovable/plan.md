
## Full Plan

### What we're doing
Two goals in one pass:
1. **Delete all subscription code** — pages, hooks, edge functions, routes, and any UI references
2. **Fix all 5 store deployment blockers** — native packages, haptics, Stripe in-app browser, ad boost in-app browser, and app icons note
3. **Remove Google Sign-In from AuthContext** — clean up the unused `signInWithGoogle` method

---

### Part 1 — Delete Subscription Code

**Files to delete entirely:**
- `src/pages/Subscription.tsx`
- `src/pages/CheckoutSuccess.tsx`
- `src/hooks/useSubscription.ts`
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/create-portal-session/index.ts`

**Files to edit (remove references):**
- `src/App.tsx` — remove `Subscription`, `CheckoutSuccess` lazy imports and their `<Route>` entries (`/settings/subscription` and `/checkout-success`)
- `src/components/subscription/SubscriptionUpsellModal.tsx` — this component now only promotes the free Business account upgrade, NOT a paid plan; it's already clean (no Stripe calls). **Keep it**, just verify it doesn't import from useSubscription (it doesn't — confirmed)
- `src/contexts/AuthContext.tsx` — remove `signInWithGoogle` method, its type in the interface, and the `supabase.auth.signInWithOAuth` call
- `supabase/config.toml` — remove the `[functions.check-subscription]`, `[functions.create-checkout-session]`, and `[functions.create-portal-session]` blocks
- `supabase/functions/apply-referral-reward/index.ts` — this currently checks for an active Stripe subscription before applying reward. Remove that gate so rewards can be applied without a subscription check (since there's no paid plan anymore)
- `supabase/functions/stripe-webhook/index.ts` — remove the `subscription` upsert logic (the `checkout.session.completed` subscription mode handler and `customer.subscription.updated/deleted` handlers). Keep the ad boost payment handler if present. **Check first before touching.**

---

### Part 2 — Fix Store Deployment Blockers

**Blocker 1 — Add missing Capacitor native packages to package.json**
Add to `package.json`:
- `@capacitor/ios` → dependencies
- `@capacitor/android` → dependencies
- `@capacitor/haptics` → dependencies
- `@capacitor/browser` → dependencies
- `@capacitor/cli` → devDependencies

**Blocker 2 — Replace `navigator.vibrate` with `@capacitor/haptics` in `src/lib/haptics.ts`**
Use `Haptics.impact()` / `Haptics.notification()` for native, with a `navigator.vibrate` fallback for web. Use `Capacitor.isNativePlatform()` to branch.

Pattern mapping:
- `light` → `ImpactStyle.Light`
- `medium` → `ImpactStyle.Medium`
- `heavy` → `ImpactStyle.Heavy`
- `success` → `NotificationType.Success`
- `warning` → `NotificationType.Warning`
- `notification` → `NotificationType.Success` (closest)

**Blocker 3 — Fix PromocionesSection ad boost `window.open`**
`src/components/dashboard/PromocionesSection.tsx` line 178: replace `window.open(data.checkout_url, "_blank")` with `Browser.open({ url: data.checkout_url })` from `@capacitor/browser`, with a `Capacitor.isNativePlatform()` check (fall back to `window.open` on web).

**Blockers 4 & 5 (Subscription page)** — eliminated by deleting `src/pages/Subscription.tsx`. The Stripe checkout and portal that used `window.open` were only in that file, which is being deleted.

---

### Part 3 — Clean up Google OAuth from AuthContext

`src/contexts/AuthContext.tsx`:
- Remove `signInWithGoogle` from the `AuthContextType` interface
- Remove the `signInWithGoogle` function body
- Remove it from the context Provider value
- No UI currently calls it (confirmed — Auth page doesn't show a Google button), so this is a clean removal

---

### stripe-webhook audit

Before touching `stripe-webhook`, check what handlers are in it. The ad boost payments (create-ad-checkout / activate-ad-campaign / charge-boost) are separate flows that do NOT use subscriptions — they use one-time Stripe Checkout payments. So in `stripe-webhook` we only remove the subscription upsert handlers, keeping any ad-boost-related webhook handler intact.

---

### Technical summary

| File | Action |
|---|---|
| `src/pages/Subscription.tsx` | Delete |
| `src/pages/CheckoutSuccess.tsx` | Delete |
| `src/hooks/useSubscription.ts` | Delete |
| `supabase/functions/check-subscription/` | Delete |
| `supabase/functions/create-checkout-session/` | Delete |
| `supabase/functions/create-portal-session/` | Delete |
| `src/App.tsx` | Remove Subscription + CheckoutSuccess routes |
| `supabase/config.toml` | Remove 3 subscription function blocks |
| `src/contexts/AuthContext.tsx` | Remove signInWithGoogle |
| `supabase/functions/apply-referral-reward/index.ts` | Remove subscription gate |
| `supabase/functions/stripe-webhook/index.ts` | Remove subscription upsert handlers |
| `package.json` | Add @capacitor/ios, android, haptics, browser, cli |
| `src/lib/haptics.ts` | Replace navigator.vibrate with @capacitor/haptics |
| `src/components/dashboard/PromocionesSection.tsx` | Replace window.open with @capacitor/browser |

No database migrations needed — the `subscriptions` table can stay (data at rest, no harm); removing the code that reads/writes it is sufficient for now and avoids risk of breaking any RLS policies.

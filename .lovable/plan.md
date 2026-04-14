

## Revised Security Hardening Plan

### 1. QR Token Protection (corrected approach)

**Do NOT drop the broad RLS policy.** Instead, switch client-side queries to use the `guestlist_entries_public` view (which already excludes `qr_code_token`) for all social/public reads.

The raw `guestlist_entries` table is only queried directly in two cases:
- The user's own entry (to show their QR on YouAreGoing/Tickets pages) — covered by "Users can view own guestlist entries" policy
- Event creator managing check-ins — covered by "Event creators can view guestlist" policy

**Files to change:**
- `src/hooks/useFollowingGoing.ts` — change `.from("guestlist_entries")` to `.from("guestlist_entries_public")` and remove the profile join (add a separate profile lookup since the view doesn't support foreign key joins)
- Any other hook that queries `guestlist_entries` for social display purposes

**No RLS policy changes needed.** The broad policy stays, but the view layer filters the sensitive column.

### 2. Hide `stripe_customer_id` and `birth_date` from public profile reads

Create a `profiles_public` view excluding `stripe_customer_id` and `birth_date`. Update hooks that fetch OTHER users' profiles to use this view:
- `useUserProfile.ts` — use `profiles_public` when fetching someone else's profile
- `useSearchUsers.ts` — use `profiles_public` for search results
- `useFollowingGoing.ts` — already only fetches `username` and `avatar_url`, no change needed

The current user's own profile queries continue using the raw `profiles` table (for edit profile, settings, etc.).

### 3. Drop `subscriptions` table and cleanup

- Migration: `DROP TABLE public.subscriptions CASCADE`
- Migration: `DROP FUNCTION IF EXISTS public.has_active_subscription`
- Migration: `DROP FUNCTION IF EXISTS public.get_subscription_plan`
- Migration: `ALTER TABLE events DROP COLUMN IF EXISTS requires_premium`
- Delete `src/components/subscription/SubscriptionUpsellModal.tsx`
- Remove any imports/references to subscriptions in hooks

### 4. Summary of what stays working

| Feature | Still works? | Why |
|---------|-------------|-----|
| "People going" avatars | Yes | Broad RLS policy stays; view strips QR only |
| Own QR on YouAreGoing | Yes | "Users can view own entries" policy on raw table |
| Creator guestlist management | Yes | "Event creators can view guestlist" policy on raw table |
| Profile pages for other users | Yes | `profiles_public` view returns all social fields |
| Business demographics (birth_date) | Yes | Analytics queries run against raw `profiles` table |
| Edit own profile | Yes | Own profile queries use raw `profiles` table |

### Files to modify

| File | Change |
|------|--------|
| Migration SQL | Create `profiles_public` view; drop `subscriptions` table + functions + `requires_premium` column |
| `src/hooks/useFollowingGoing.ts` | Switch from `guestlist_entries` to `guestlist_entries_public` |
| `src/hooks/useUserProfile.ts` | Use `profiles_public` when fetching other users |
| `src/hooks/useSearchUsers.ts` | Use `profiles_public` for search results |
| `src/components/subscription/SubscriptionUpsellModal.tsx` | Delete file |
| Any files importing subscription modal | Remove dead imports |


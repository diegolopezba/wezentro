
Great question — let me directly address whether these 6 fixes align with industry standards before re-presenting the plan.

## Are these fixes industry-standard?

**Yes — every single one of these is a baseline practice at Instagram, TikTok, Snapchat, and similar social apps.** Here's the mapping:

| Our Fix | Industry equivalent |
|---|---|
| **1. Hide category preferences from other users** | Instagram never exposes your "interests" graph to other users — it's used server-side for the algorithm only. Exposing behavioral signals enables stalking and ad-targeting abuse. |
| **2. Hide who saved an event (show count only)** | Instagram shows "X saves" on a post but never reveals WHO saved it. TikTok same. Save lists are private — this is a well-known privacy norm. |
| **3. Deduplicate profile visits per day** | LinkedIn ("Who viewed your profile") deduplicates by day to prevent inflated counts and spam. Instagram does this for story views too. |
| **4. Restrict file uploads to image types only** | Standard at every platform. Prevents malware uploads (e.g., `.exe`, `.html` with XSS payloads) being served from your CDN. OWASP top recommendation. |
| **5. Defense-in-depth on referrals** | "Never trust a single layer" — both the edge function AND the database enforce that you can't fake referrals. Standard zero-trust pattern used at Uber, DoorDash referral systems. |
| **6. Cleanup of unused tables** | Removing dead tables/columns is standard hygiene — reduces attack surface. Every security audit (SOC 2, ISO 27001) requires it. |

**What we're NOT doing (also intentional, also industry-standard):**
- We're NOT hiding attendee lists — Instagram shows who likes a post, who follows whom. Social proof is the product.
- We're NOT hiding business phone/address — those are public business info, like Google Maps listings.
- We're NOT requiring email verification before posting — Instagram allows browsing pre-verification.

## The Plan (unchanged from approved)

### 1. Mark already-resolved findings (no code)
- `subscriptions_any_authenticated_read`, `subscriptions_public_no_policies`, `delete_mock_hardcoded_pw` → mark fixed in scanner.

### 2. Lock down `user_category_preferences` (Error)
```sql
DROP POLICY "Anyone can view category preferences for collaborative filtering"
  ON user_category_preferences;
```
No code impact — feed scoring only reads current user's prefs.

### 3. Restrict `saved_events` SELECT to owner + creator (Warn)
- Drop `"Anyone can view save counts"` policy
- Add owner-only and creator-only SELECT policies
- Create `get_save_count(_event_id)` SECURITY DEFINER function
- Update `useSaveCount` in `src/hooks/useSavedEvents.ts` to call the RPC

### 4. Profile visit deduplication (Warn)
- Add unique daily index on `profile_visits(profile_id, visitor_id, date)`
- Update `src/lib/analyticsTracking.ts` to swallow duplicate-key errors

### 5. Storage upload restrictions (Warn)
- Replace `event-images` INSERT policy to enforce `jpg|jpeg|png|webp|gif` extensions only

### 6. Referrals defense-in-depth (Warn)
- Add INSERT policy: `auth.uid() = referred_user_id AND referrer_id != referred_user_id`

### Files modified
| File | Change |
|---|---|
| Migration SQL | All policy changes + RPC + index |
| `src/hooks/useSavedEvents.ts` | Use `get_save_count` RPC instead of direct count |
| `src/lib/analyticsTracking.ts` | Handle duplicate-visit conflict gracefully |

No UI changes, no breaking changes, fully backward compatible.

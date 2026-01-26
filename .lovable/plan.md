
# Referral Program Implementation Plan

## Overview
Create a referral system where users can invite others via unique referral links. When 5 users sign up through a referrer's link, they earn 1 free month of Zentro Premium subscription. Each user can only redeem this reward once.

---

## Database Changes

### New Table: `referrals`
Tracks all referral relationships and codes.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| referrer_id | uuid | User who shared the link (FK to profiles) |
| referred_user_id | uuid | User who signed up (FK to profiles) |
| referral_code | text | The code used for signup |
| created_at | timestamptz | When referral was recorded |
| status | text | 'pending' or 'completed' |

### New Table: `referral_rewards`
Tracks reward redemption status.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Referrer who earned reward (FK to profiles, UNIQUE) |
| reward_type | text | 'free_month' |
| redeemed_at | timestamptz | When reward was claimed |
| stripe_coupon_id | text | Applied Stripe coupon ID |
| created_at | timestamptz | When reward was earned |

### Profile Extension
Add `referral_code` column to `profiles` table:
- Unique short code per user (e.g., "ZENTRO_abc123")
- Generated on first access to referral page

---

## Implementation Phases

### Phase 1: Database Setup
1. Create `referrals` table with RLS policies
2. Create `referral_rewards` table with RLS policies
3. Add `referral_code` column to `profiles`
4. Create database function to generate unique referral codes
5. Create trigger to track successful referrals

### Phase 2: Auth Flow Integration
1. Update Auth.tsx to capture `?ref=CODE` query parameter
2. Store referral code in localStorage before signup
3. After successful signup, record referral in database
4. Update Onboarding.tsx to process stored referral

### Phase 3: Backend Edge Functions

**New: `process-referral` function**
- Called after new user completes onboarding
- Validates referral code exists
- Creates referral record
- Checks if referrer now has 5+ referrals
- If yes and not yet rewarded, triggers reward

**New: `apply-referral-reward` function**
- Creates a Stripe coupon for 1 free month
- Applies to referrer's next billing cycle
- Marks reward as redeemed in database
- Sends notification to referrer

**New: `generate-referral-code` function**
- Generates unique short code for user
- Updates profile with code
- Returns shareable link

### Phase 4: Frontend - Referral Page

**New Page: `/settings/referrals` (Referrals.tsx)**

UI Components:
1. **Share Section**
   - User's unique referral link with copy button
   - Native share button (Web Share API)
   - Visual: Personalized referral card

2. **Progress Tracker**
   - Shows X/5 referrals completed
   - Progress bar with milestone markers
   - List of referred usernames (partial for privacy)

3. **Reward Status**
   - If < 5: "Invite 5 friends to earn 1 free month!"
   - If = 5 and not redeemed: "Claim your free month!" button
   - If redeemed: "Reward claimed! Keep inviting to help friends discover Zentro"

### Phase 5: Settings Integration
1. Add "Invitar Amigos" option to Settings.tsx
2. Add referral badge/indicator on Profile page
3. Add notification when referral signs up
4. Add notification when reward is earned

---

## Technical Details

### Referral Link Format
```
https://wezentro.lovable.app/auth?ref=ZENTRO_abc123
```

### Referral Code Generation
```typescript
// 8 character alphanumeric + prefix
const code = `ZENTRO_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
```

### Stripe Free Month Implementation
- Create a 100% off coupon valid for 1 month
- Apply via Stripe API to customer's subscription
- Only works if user has active subscription

### RLS Policies
- Users can only read their own referral data
- Users can see count of their successful referrals
- Referral creation only via backend (service role)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Referrals.tsx` | **Create** - Referral program page |
| `src/hooks/useReferrals.ts` | **Create** - Hook for referral data |
| `src/pages/Settings.tsx` | **Modify** - Add referrals menu item |
| `src/pages/Auth.tsx` | **Modify** - Capture ref query param |
| `src/pages/Onboarding.tsx` | **Modify** - Process referral after signup |
| `src/App.tsx` | **Modify** - Add /settings/referrals route |
| `supabase/functions/process-referral/index.ts` | **Create** - Backend referral processing |
| `supabase/functions/apply-referral-reward/index.ts` | **Create** - Apply Stripe reward |
| Database migration | **Create** - Tables and functions |

---

## User Flow

```text
+------------------+     +------------------+     +------------------+
|   User A shares  | --> |   User B clicks  | --> |   User B signs   |
|   referral link  |     |   link with ?ref |     |   up on Zentro   |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                         +------------------+     +------------------+
                         |   User A gets    | <-- |   Referral is    |
                         |   notification   |     |   recorded in DB |
                         +------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |   After 5 refs,  |
                         |   User A claims  |
                         |   free month     |
                         +------------------+
```

---

## Edge Cases Handled

1. **Self-referral prevention**: Check referrer_id != referred_user_id
2. **Duplicate referrals**: Unique constraint on referred_user_id
3. **Invalid codes**: Validate code exists before recording
4. **Already redeemed**: Check referral_rewards before allowing claim
5. **No subscription**: Reward only applies to future subscription
6. **Code collision**: UUID-based generation prevents collisions

---

## Notifications

New notification type: `referral_signup`
- "¡@username se unió usando tu enlace! (X/5 para tu mes gratis)"

New notification type: `referral_reward_earned`
- "¡Felicidades! Has ganado 1 mes gratis de Zentro Premium"


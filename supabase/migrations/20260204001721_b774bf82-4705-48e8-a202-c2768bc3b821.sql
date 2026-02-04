
-- Drop the unique constraint on user_id to allow multiple rewards per user
ALTER TABLE public.referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_user_id_key;

-- Add column to track which referral this reward is for
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL;

-- Add column to referrals to track if it's a business/places referral and payment status
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS referred_plan_type TEXT,
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;

-- Drop old function and recreate with new signature
DROP FUNCTION IF EXISTS public.get_referral_stats(uuid);

-- Recreate function with pending_rewards count
CREATE OR REPLACE FUNCTION public.get_referral_stats(_user_id uuid)
RETURNS TABLE(referral_count bigint, reward_claimed boolean, referral_code text, pending_rewards bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM referrals WHERE referrer_id = _user_id)::BIGINT,
    EXISTS(SELECT 1 FROM referral_rewards WHERE user_id = _user_id AND redeemed_at IS NOT NULL),
    (SELECT p.referral_code FROM profiles p WHERE p.id = _user_id),
    (SELECT COUNT(*) FROM referral_rewards WHERE user_id = _user_id AND redeemed_at IS NULL)::BIGINT;
END;
$$;

-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referred_user_id),
  CONSTRAINT referrals_referred_user_unique UNIQUE (referred_user_id)
);

-- Create referral_rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  reward_type TEXT NOT NULL DEFAULT 'free_month',
  redeemed_at TIMESTAMPTZ,
  stripe_coupon_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals table
CREATE POLICY "Users can view their own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view if they were referred"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_user_id);

-- RLS policies for referral_rewards table
CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Check if user already has a code
  SELECT referral_code INTO new_code FROM profiles WHERE id = _user_id;
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate unique code
  LOOP
    new_code := 'ZENTRO_' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Update profile with new code
  UPDATE profiles SET referral_code = new_code WHERE id = _user_id;
  
  RETURN new_code;
END;
$$;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(_user_id UUID)
RETURNS TABLE(
  referral_count BIGINT,
  reward_claimed BOOLEAN,
  referral_code TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM referrals WHERE referrer_id = _user_id)::BIGINT,
    EXISTS(SELECT 1 FROM referral_rewards WHERE user_id = _user_id AND redeemed_at IS NOT NULL),
    (SELECT p.referral_code FROM profiles p WHERE p.id = _user_id);
END;
$$;

-- Trigger function for referral signup notification
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_username TEXT;
  referral_count BIGINT;
BEGIN
  -- Get the referred user's username
  SELECT username INTO referred_username FROM profiles WHERE id = NEW.referred_user_id;
  
  -- Get current referral count for the referrer
  SELECT COUNT(*) INTO referral_count FROM referrals WHERE referrer_id = NEW.referrer_id;
  
  -- Create notification for referrer
  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.referrer_id,
    'referral_signup',
    'Nuevo referido',
    '@' || referred_username || ' se unió usando tu enlace (' || referral_count || '/5 para tu mes gratis)',
    'user',
    NEW.referred_user_id
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_new_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- 1. Create profiles_public view (excludes stripe_customer_id and birth_date)
CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker = true) AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  city,
  is_business,
  is_food_business,
  interests,
  business_address,
  business_hours,
  business_phone,
  business_type,
  business_latitude,
  business_longitude,
  reservation_start_time,
  reservation_end_time,
  reservation_capacity,
  reservations_enabled,
  menu_enabled,
  referral_code,
  gender,
  created_at,
  updated_at
FROM public.profiles;

-- 2. Drop subscriptions table and related objects
DROP VIEW IF EXISTS public.subscriptions_public CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid);
DROP FUNCTION IF EXISTS public.get_subscription_plan(uuid);

-- 3. Drop requires_premium column from events
ALTER TABLE public.events DROP COLUMN IF EXISTS requires_premium;

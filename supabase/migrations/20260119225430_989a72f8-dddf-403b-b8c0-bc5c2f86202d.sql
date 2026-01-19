-- Drop the existing check constraint and add a new one that includes food_premium
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type IN ('free', 'user_premium', 'food_premium', 'business_premium'));
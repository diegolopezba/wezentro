-- Drop the existing constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Add new constraint with the correct plan types
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type = ANY (ARRAY['user_premium'::text, 'business_premium'::text]));
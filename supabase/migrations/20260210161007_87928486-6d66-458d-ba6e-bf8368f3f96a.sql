-- Recreate the public view as security_definer so it can read subscriptions
-- regardless of who's querying (the view already strips sensitive columns)
DROP VIEW IF EXISTS public.subscriptions_public;

CREATE VIEW public.subscriptions_public
WITH (security_invoker = false) AS
SELECT id, user_id, plan_type, status, current_period_end, created_at
FROM public.subscriptions;

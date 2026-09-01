CREATE OR REPLACE FUNCTION public.get_business_public_tier(_business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN s.status IN ('active', 'past_due') THEN s.tier
    ELSE 'basico'
  END
  FROM public.business_subscriptions s
  WHERE s.business_id = _business_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_business_public_tier(uuid) TO authenticated, anon, service_role;
CREATE OR REPLACE FUNCTION public.has_active_business_plan(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_subscriptions s
    WHERE s.business_id = _business_id
      AND s.status IN ('active', 'past_due')
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_active_business_plan(uuid) TO anon, authenticated, service_role;
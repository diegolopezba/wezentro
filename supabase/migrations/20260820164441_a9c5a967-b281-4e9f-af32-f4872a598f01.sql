CREATE OR REPLACE FUNCTION public.ensure_food_business_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_business = true AND NEW.business_type IN ('restaurant','coffee','bar') THEN
    INSERT INTO public.business_subscriptions (business_id, tier, status, activation_method)
    VALUES (NEW.id, 'basico', 'pending_activation', 'manual')
    ON CONFLICT (business_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
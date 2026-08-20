CREATE TABLE public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'basico' CHECK (tier IN ('basico','profesional','elite')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending_activation','past_due','cancelled')),
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  activation_method text NOT NULL DEFAULT 'manual' CHECK (activation_method IN ('manual','qhantuy')),
  qhantuy_subscription_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);

GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT ALL ON public.business_subscriptions TO service_role;

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can view own subscription"
  ON public.business_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = business_id);

CREATE TRIGGER update_business_subscriptions_updated_at
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing food businesses
INSERT INTO public.business_subscriptions (business_id, tier, status, activation_method)
SELECT p.id, 'basico', 'active', 'manual'
FROM public.profiles p
WHERE p.is_business = true
  AND p.business_type IN ('restaurant','coffee','bar')
ON CONFLICT (business_id) DO NOTHING;

-- Auto-create default subscription for new/updated food businesses
CREATE OR REPLACE FUNCTION public.ensure_food_business_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_business = true AND NEW.business_type IN ('restaurant','coffee','bar') THEN
    INSERT INTO public.business_subscriptions (business_id, tier, status, activation_method)
    VALUES (NEW.id, 'basico', 'active', 'manual')
    ON CONFLICT (business_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_food_business_subscription_trigger
  AFTER INSERT OR UPDATE OF is_business, business_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_food_business_subscription();
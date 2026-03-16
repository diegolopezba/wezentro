
-- Create business_payment_settings table
CREATE TABLE public.business_payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  bnb_account_id TEXT NOT NULL,
  bnb_authorization_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own payment settings"
  ON public.business_payment_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own payment settings"
  ON public.business_payment_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own payment settings"
  ON public.business_payment_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own payment settings"
  ON public.business_payment_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_business_payment_settings_updated_at
  BEFORE UPDATE ON public.business_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_sessions table
CREATE TABLE public.payment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL,
  business_user_id UUID NOT NULL,
  bnb_qr_id TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own payment sessions"
  ON public.payment_sessions FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Business owners can view their payment sessions"
  ON public.payment_sessions FOR SELECT
  USING (auth.uid() = business_user_id);

CREATE POLICY "Buyers can create payment sessions"
  ON public.payment_sessions FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

CREATE POLICY "Buyers can update own payment sessions"
  ON public.payment_sessions FOR UPDATE
  USING (auth.uid() = buyer_user_id);

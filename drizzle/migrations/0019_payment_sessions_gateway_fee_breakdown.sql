ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS gateway_fee_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payment_sessions.base_amount IS 'Precio base (sin comisión del gateway). amount = base_amount + gateway_fee_amount.';
COMMENT ON COLUMN public.payment_sessions.gateway_fee_amount IS 'Comisión de Qhantuy cobrada al comprador (PRE_CHARGE).';

UPDATE public.payment_sessions SET base_amount = amount WHERE base_amount IS NULL;
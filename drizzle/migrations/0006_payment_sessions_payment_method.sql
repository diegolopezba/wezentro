ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'qr';

ALTER TABLE public.payment_sessions
  DROP CONSTRAINT IF EXISTS payment_sessions_payment_method_check;

ALTER TABLE public.payment_sessions
  ADD CONSTRAINT payment_sessions_payment_method_check
  CHECK (payment_method IN ('qr', 'card'));
ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS platform_fee_bps integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS payout_amount numeric;
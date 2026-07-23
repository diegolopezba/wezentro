
-- 1. New beneficiaries table (one per business)
CREATE TABLE public.qhantuy_beneficiaries (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  beneficiary_code text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  ci_number text NOT NULL,
  email text NOT NULL,
  bank_id integer NOT NULL,
  bank_name text,
  account_number text NOT NULL,
  account_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qhantuy_beneficiaries TO authenticated;
GRANT ALL ON public.qhantuy_beneficiaries TO service_role;

ALTER TABLE public.qhantuy_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own beneficiary"
  ON public.qhantuy_beneficiaries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own beneficiary"
  ON public.qhantuy_beneficiaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own beneficiary"
  ON public.qhantuy_beneficiaries FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete own beneficiary"
  ON public.qhantuy_beneficiaries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_qhantuy_beneficiaries_updated_at
  BEFORE UPDATE ON public.qhantuy_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. payment_sessions: add Qhantuy fields, drop BNB
ALTER TABLE public.payment_sessions
  ADD COLUMN qhantuy_transaction_id bigint,
  ADD COLUMN qhantuy_raw_callback jsonb,
  ADD COLUMN beneficiary_code text,
  ADD COLUMN provider text NOT NULL DEFAULT 'qhantuy';

ALTER TABLE public.payment_sessions DROP COLUMN bnb_qr_id;

CREATE INDEX idx_payment_sessions_qhantuy_tx
  ON public.payment_sessions (qhantuy_transaction_id)
  WHERE qhantuy_transaction_id IS NOT NULL;

-- 3. Drop the old BNB settings table
DROP TABLE public.business_payment_settings;

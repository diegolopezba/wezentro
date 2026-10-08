CREATE TABLE public.business_fee_terms (
  business_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  fee_bps integer CHECK (fee_bps IS NULL OR (fee_bps >= 0 AND fee_bps <= 3000)),
  fee_paid_by text NOT NULL DEFAULT 'organizer' CHECK (fee_paid_by IN ('organizer','buyer')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT ALL ON public.business_fee_terms TO service_role;
ALTER TABLE public.business_fee_terms ENABLE ROW LEVEL SECURITY;

-- Public, read-only view of the terms needed to show the buyer the right total.
CREATE OR REPLACE FUNCTION public.get_checkout_fee_terms(_event_id uuid DEFAULT NULL, _experience_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owner AS (
    SELECT COALESCE(
      (SELECT creator_id FROM public.events WHERE id = _event_id),
      (SELECT business_id FROM public.experiences WHERE id = _experience_id)
    ) AS id
  )
  SELECT jsonb_build_object(
    'fee_bps', COALESCE(t.fee_bps, 600),
    'fee_paid_by', COALESCE(t.fee_paid_by, 'organizer')
  )
  FROM owner o LEFT JOIN public.business_fee_terms t ON t.business_id = o.id
$$;
GRANT EXECUTE ON FUNCTION public.get_checkout_fee_terms(uuid, uuid) TO anon, authenticated;
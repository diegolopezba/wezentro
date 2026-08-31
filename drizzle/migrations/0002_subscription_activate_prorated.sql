-- Support prorated mid-cycle upgrades: keep the existing renewal date.
DROP FUNCTION IF EXISTS public.activate_business_subscription(uuid, text, text, uuid, numeric);

CREATE OR REPLACE FUNCTION public.activate_business_subscription(
  _business_id uuid,
  _tier text,
  _interval text,
  _session_id uuid,
  _amount numeric,
  _prorated boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing public.business_subscriptions%ROWTYPE;
  _start timestamptz;
  _end timestamptz;
  _step interval;
BEGIN
  IF _tier NOT IN ('basico', 'profesional', 'elite') THEN
    RAISE EXCEPTION 'invalid tier %', _tier;
  END IF;
  IF _interval NOT IN ('month', 'year') THEN
    RAISE EXCEPTION 'invalid interval %', _interval;
  END IF;

  SELECT * INTO _existing
  FROM public.business_subscriptions
  WHERE business_id = _business_id;

  IF _existing.id IS NOT NULL AND _existing.last_payment_session_id = _session_id THEN
    RETURN jsonb_build_object('status', 'already_applied', 'tier', _existing.tier);
  END IF;

  _step := CASE WHEN _interval = 'year' THEN interval '12 months' ELSE interval '1 month' END;

  IF _prorated
     AND _existing.id IS NOT NULL
     AND _existing.billing_period_end IS NOT NULL
     AND _existing.billing_period_end > now() THEN
    -- Mid-cycle upgrade: only the difference was charged, renewal date stays.
    _start := COALESCE(_existing.billing_period_start, now());
    _end := _existing.billing_period_end;
  ELSIF _existing.id IS NOT NULL
     AND _existing.tier = _tier
     AND _existing.billing_period_end IS NOT NULL
     AND _existing.billing_period_end > now() THEN
    _start := COALESCE(_existing.billing_period_start, now());
    _end := _existing.billing_period_end + _step;
  ELSE
    _start := now();
    _end := now() + _step;
  END IF;

  INSERT INTO public.business_subscriptions AS bs (
    business_id, tier, status, billing_period_start, billing_period_end,
    billing_interval, grace_until, activation_method,
    last_payment_session_id, amount_paid_bob, cancelled_at, updated_at
  )
  VALUES (
    _business_id, _tier, 'active', _start, _end,
    _interval, _end + interval '3 days', 'qhantuy',
    _session_id, _amount, NULL, now()
  )
  ON CONFLICT (business_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    status = 'active',
    billing_period_start = EXCLUDED.billing_period_start,
    billing_period_end = EXCLUDED.billing_period_end,
    billing_interval = CASE WHEN _prorated THEN bs.billing_interval ELSE EXCLUDED.billing_interval END,
    grace_until = EXCLUDED.grace_until,
    activation_method = 'qhantuy',
    last_payment_session_id = EXCLUDED.last_payment_session_id,
    amount_paid_bob = EXCLUDED.amount_paid_bob,
    cancelled_at = NULL,
    reminders_sent = '[]'::jsonb,
    updated_at = now();

  RETURN jsonb_build_object('status', 'ok', 'tier', _tier, 'billing_period_end', _end);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_business_subscription(uuid, text, text, uuid, numeric, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_business_subscription(uuid, text, text, uuid, numeric, boolean) TO service_role;
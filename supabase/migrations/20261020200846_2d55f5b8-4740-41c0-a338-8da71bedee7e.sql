CREATE TABLE public.event_discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  tier_ids uuid[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT percent_max CHECK (discount_type <> 'percent' OR discount_value <= 100)
);
CREATE UNIQUE INDEX event_discount_codes_event_code ON public.event_discount_codes(event_id, upper(code));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_discount_codes TO authenticated;
GRANT ALL ON public.event_discount_codes TO service_role;
ALTER TABLE public.event_discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event owners manage discount codes" ON public.event_discount_codes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.normalize_discount_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := upper(regexp_replace(NEW.code, '\s+', '', 'g'));
  IF length(NEW.code) < 3 OR length(NEW.code) > 30 THEN RAISE EXCEPTION 'El código debe tener entre 3 y 30 caracteres'; END IF;
  IF NEW.ends_at IS NOT NULL AND NEW.starts_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'La fecha de fin debe ser posterior al inicio'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_normalize_discount_code BEFORE INSERT OR UPDATE ON public.event_discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.normalize_discount_code();

ALTER TABLE public.payment_sessions
  ADD COLUMN discount_code_id uuid REFERENCES public.event_discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;
CREATE INDEX payment_sessions_discount_code ON public.payment_sessions(discount_code_id) WHERE discount_code_id IS NOT NULL;

-- Usage counts for the organizer (confirmed purchases only)
CREATE OR REPLACE FUNCTION public.get_event_discount_code_usage(_event_id uuid)
RETURNS TABLE(discount_code_id uuid, uses bigint, discount_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ps.discount_code_id, count(*), coalesce(sum(ps.discount_amount),0)
  FROM payment_sessions ps
  JOIN events e ON e.id = ps.event_id
  WHERE ps.event_id = _event_id AND e.creator_id = auth.uid()
    AND ps.discount_code_id IS NOT NULL AND ps.status = 'confirmed'
  GROUP BY ps.discount_code_id
$$;
GRANT EXECUTE ON FUNCTION public.get_event_discount_code_usage(uuid) TO authenticated;

-- Buyer-side preview validation (server re-validates on checkout)
CREATE OR REPLACE FUNCTION public.check_event_discount_code(_event_id uuid, _code text, _tier_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c event_discount_codes; used bigint;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Iniciá sesión para usar un código'); END IF;
  SELECT * INTO c FROM event_discount_codes
   WHERE event_id = _event_id AND code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'));
  IF c.id IS NULL OR NOT c.is_active THEN RETURN jsonb_build_object('ok',false,'error','Código inválido'); END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN RETURN jsonb_build_object('ok',false,'error','Este código aún no está vigente'); END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN RETURN jsonb_build_object('ok',false,'error','Este código ya venció'); END IF;
  IF cardinality(c.tier_ids) > 0 AND (_tier_id IS NULL OR NOT _tier_id = ANY(c.tier_ids)) THEN
    RETURN jsonb_build_object('ok',false,'error','Este código no aplica a esta entrada'); END IF;
  IF EXISTS (SELECT 1 FROM payment_sessions WHERE discount_code_id = c.id AND buyer_user_id = auth.uid() AND status = 'confirmed') THEN
    RETURN jsonb_build_object('ok',false,'error','Ya usaste este código'); END IF;
  IF c.max_uses IS NOT NULL THEN
    SELECT count(*) INTO used FROM payment_sessions WHERE discount_code_id = c.id AND status = 'confirmed';
    IF used >= c.max_uses THEN RETURN jsonb_build_object('ok',false,'error','Este código ya alcanzó su límite de usos'); END IF;
  END IF;
  RETURN jsonb_build_object('ok',true,'code',c.code,'discount_type',c.discount_type,'discount_value',c.discount_value);
END $$;
GRANT EXECUTE ON FUNCTION public.check_event_discount_code(uuid, text, uuid) TO authenticated;
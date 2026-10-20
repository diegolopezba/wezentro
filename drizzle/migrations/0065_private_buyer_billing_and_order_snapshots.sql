CREATE TABLE public.user_billing_details (
 user_id uuid PRIMARY KEY, legal_name text NOT NULL, document_type text NOT NULL, document_number text NOT NULL, phone text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT billing_name_length CHECK (length(btrim(legal_name)) BETWEEN 3 AND 200),
 CONSTRAINT billing_document_type CHECK (document_type IN ('NIT','CI')),
 CONSTRAINT billing_document_format CHECK (document_number ~ '^[0-9]{4,20}(-[A-Za-z0-9]{1,4})?$'),
 CONSTRAINT billing_phone_format CHECK (phone ~ '^\+?[0-9]{8,15}$')
);
GRANT SELECT ON public.user_billing_details TO authenticated;
GRANT ALL ON public.user_billing_details TO service_role;
ALTER TABLE public.user_billing_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own billing details" ON public.user_billing_details FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.payment_billing_details (
 payment_session_id uuid PRIMARY KEY REFERENCES public.payment_sessions(id) ON DELETE CASCADE,
 legal_name text NOT NULL, document_type text NOT NULL, document_number text NOT NULL, phone text NOT NULL, captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_billing_details TO authenticated;
GRANT ALL ON public.payment_billing_details TO service_role;
ALTER TABLE public.payment_billing_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers and sellers read order billing" ON public.payment_billing_details FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.payment_sessions p WHERE p.id = payment_session_id AND (p.buyer_user_id = auth.uid() OR p.business_user_id = auth.uid())));

CREATE FUNCTION public.save_my_billing_details(_legal_name text, _document_type text, _document_number text, _phone text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_details public.user_billing_details; v_count integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Inicia sesión para guardar tus datos'; END IF;
 INSERT INTO public.user_billing_details(user_id,legal_name,document_type,document_number,phone)
 VALUES(v_user,btrim(_legal_name),upper(_document_type),upper(btrim(_document_number)),regexp_replace(_phone,'[\s()-]','','g'))
 ON CONFLICT(user_id) DO UPDATE SET legal_name=EXCLUDED.legal_name, document_type=EXCLUDED.document_type, document_number=EXCLUDED.document_number, phone=EXCLUDED.phone, updated_at=now()
 RETURNING * INTO v_details;
 INSERT INTO public.payment_billing_details(payment_session_id,legal_name,document_type,document_number,phone)
 SELECT p.id,v_details.legal_name,v_details.document_type,v_details.document_number,v_details.phone FROM public.payment_sessions p
 WHERE p.buyer_user_id=v_user AND p.status='confirmed' AND p.event_id IS NOT NULL AND NOT coalesce(p.is_gate_sale,false)
 ON CONFLICT(payment_session_id) DO NOTHING;
 GET DIAGNOSTICS v_count = ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'updated_orders',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.save_my_billing_details(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_billing_details(text,text,text,text) TO authenticated;

CREATE FUNCTION public.capture_payment_billing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.buyer_user_id IS NOT NULL AND NEW.event_id IS NOT NULL AND NOT coalesce(NEW.is_gate_sale,false) THEN
 INSERT INTO public.payment_billing_details(payment_session_id,legal_name,document_type,document_number,phone)
 SELECT NEW.id,b.legal_name,b.document_type,b.document_number,b.phone FROM public.user_billing_details b WHERE b.user_id=NEW.buyer_user_id
 ON CONFLICT(payment_session_id) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.capture_payment_billing() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_payment_billing AFTER INSERT OR UPDATE OF status ON public.payment_sessions FOR EACH ROW EXECUTE FUNCTION public.capture_payment_billing();

CREATE FUNCTION public.get_my_missing_billing_orders() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*)::integer FROM public.payment_sessions p WHERE p.buyer_user_id=auth.uid() AND p.status='confirmed' AND p.event_id IS NOT NULL AND NOT coalesce(p.is_gate_sale,false) AND NOT EXISTS(SELECT 1 FROM public.payment_billing_details b WHERE b.payment_session_id=p.id);
$$;
REVOKE ALL ON FUNCTION public.get_my_missing_billing_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_missing_billing_orders() TO authenticated;

CREATE FUNCTION public.get_event_billing_export(_event_id uuid) RETURNS TABLE(order_id uuid,purchased_at timestamptz,quantity integer,subtotal numeric,amount numeric,buyer_name text,tier_name text,legal_name text,document_type text,document_number text,phone text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=_event_id AND e.creator_id=auth.uid()) THEN RAISE EXCEPTION 'No tienes acceso a estas ventas'; END IF;
 RETURN QUERY SELECT p.id,p.created_at,coalesce(p.quantity,1),p.base_amount,p.amount,pr.full_name,coalesce(t.name,p.gate_offer_name,'Entrada general'),b.legal_name,b.document_type,b.document_number,b.phone
 FROM public.payment_sessions p LEFT JOIN public.payment_billing_details b ON b.payment_session_id=p.id LEFT JOIN public.profiles pr ON pr.id=p.buyer_user_id LEFT JOIN public.ticket_tiers t ON t.id=p.ticket_tier_id
 WHERE p.event_id=_event_id AND p.status='confirmed' ORDER BY p.created_at;
END; $$;
REVOKE ALL ON FUNCTION public.get_event_billing_export(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_billing_export(uuid) TO authenticated;
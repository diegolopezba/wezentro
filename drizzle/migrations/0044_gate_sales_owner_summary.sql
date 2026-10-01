CREATE OR REPLACE FUNCTION public.get_gate_sales_summary(_event_id uuid)
RETURNS TABLE(tickets bigint, revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(ps.quantity), 0)::bigint, COALESCE(SUM(ps.base_amount), 0)::numeric
  FROM public.payment_sessions ps
  WHERE ps.event_id = _event_id AND ps.is_gate_sale = true AND ps.status = 'confirmed'
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.creator_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_gate_sales_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gate_sales_summary(uuid) TO authenticated;
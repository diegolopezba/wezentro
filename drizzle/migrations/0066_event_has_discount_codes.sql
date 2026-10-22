CREATE OR REPLACE FUNCTION public.event_has_discount_codes(_event_id uuid, _tier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_discount_codes c
    WHERE c.event_id = _event_id
      AND c.is_active
      AND (c.starts_at IS NULL OR now() >= c.starts_at)
      AND (c.ends_at IS NULL OR now() <= c.ends_at)
      AND (cardinality(c.tier_ids) = 0 OR _tier_id = ANY(c.tier_ids))
      AND (c.max_uses IS NULL OR (
        SELECT count(*) FROM public.payment_sessions ps
         WHERE ps.discount_code_id = c.id AND ps.status = 'confirmed'
      ) < c.max_uses)
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_sessions ps
         WHERE ps.discount_code_id = c.id
           AND ps.buyer_user_id = auth.uid()
           AND ps.status = 'confirmed'
      )
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.event_has_discount_codes(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.event_has_discount_codes(uuid, uuid) TO authenticated;
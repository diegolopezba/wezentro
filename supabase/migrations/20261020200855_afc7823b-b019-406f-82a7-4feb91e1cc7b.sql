REVOKE EXECUTE ON FUNCTION public.get_event_discount_code_usage(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_event_discount_code(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_event_announcement_recipients(UUID) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.count_event_announcements_24h(UUID) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_event_announcement_recipients(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_event_announcements_24h(UUID) TO service_role;
GRANT SELECT, UPDATE ON public.experience_bookings TO authenticated;
GRANT ALL ON public.experience_bookings TO service_role;

GRANT SELECT ON public.experience_booking_guests TO authenticated;
GRANT ALL ON public.experience_booking_guests TO service_role;

GRANT SELECT ON public.experiences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT ALL ON public.experiences TO service_role;

GRANT SELECT ON public.experience_segments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_segments TO authenticated;
GRANT ALL ON public.experience_segments TO service_role;
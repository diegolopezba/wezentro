-- Break the mutual recursion between experience_bookings and experience_booking_guests policies.
CREATE OR REPLACE FUNCTION public.is_experience_booking_guest(_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.experience_booking_guests g
    WHERE g.booking_id = _booking_id AND g.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_experience_booking(_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.experience_bookings b
    WHERE b.id = _booking_id
      AND (b.user_id = auth.uid() OR public.owns_experience(b.experience_id))
  )
$$;

DROP POLICY IF EXISTS experience_bookings_tagged_guest_read ON public.experience_bookings;
DROP POLICY IF EXISTS experience_bookings_read ON public.experience_bookings;
CREATE POLICY experience_bookings_read ON public.experience_bookings
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.owns_experience(experience_id)
  OR public.is_experience_booking_guest(id)
);

DROP POLICY IF EXISTS experience_booking_guests_read ON public.experience_booking_guests;
CREATE POLICY experience_booking_guests_read ON public.experience_booking_guests
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_manage_experience_booking(booking_id)
);

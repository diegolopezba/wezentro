CREATE POLICY "experience_bookings_tagged_guest_read"
ON public.experience_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.experience_booking_guests g
    WHERE g.booking_id = id AND g.user_id = auth.uid()
  )
);
-- El negocio (dueño del evento) gestiona las reservas de sus áreas
CREATE POLICY "Event owners manage bookings"
ON public.area_bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.event_areas ea
    JOIN public.events e ON e.id = ea.event_id
    WHERE ea.id = area_bookings.event_area_id
      AND e.creator_id = auth.uid()
  )
);

-- El invitado puede cancelar su propia reserva
CREATE POLICY "Users update their own bookings"
ON public.area_bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
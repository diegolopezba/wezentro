# Reservas de mesa vs. reservas de experiencias: paridad de inventario

## Respuesta corta

Sí, las dos usan inventario real del lado del servidor y ninguna puede sobrevender:

- **Mesas**: `create_reservation` bloquea la fila/slot y valida turnos y capacidad antes de insertar.
- **Experiencias**: `get_experience_availability` genera los horarios desde los turnos configurados (`experience_schedules`), descuenta blackouts, cupos ya tomados y holds de pago vigentes, y marca cada horario como `available` / `limited` / `full`. La hoja de reserva deshabilita los horarios `full`. Al confirmar, `create_experience_booking` toma un lock por experiencia+fecha+hora y vuelve a contar los cupos antes de insertar, así que dos personas simultáneas no pueden pasar del cupo.

Lo que **no** está igual es la frescura de lo que ve el usuario y la vista del negocio. Las mejoras que acabamos de hacer en reservas de mesa no se aplicaron a experiencias.

## Diferencias que quedaron pendientes

1. La disponibilidad de experiencias se cachea 30 segundos y no se refresca al abrir la hoja ni al cambiar de fecha, así que se pueden mostrar horarios ya llenos hasta medio minuto.
2. Si la reserva falla por "Ya no quedan lugares", los horarios en pantalla no se actualizan: el usuario ve el mismo horario disponible y vuelve a intentar.
3. La lista de reservas de experiencia del negocio no es en vivo (las de mesa ahora sí lo son).

## Cambios propuestos

**Hoja de reserva de experiencia (`ExperienceBookingSheet.tsx`)**
- Refrescar disponibilidad al abrir la hoja y cada vez que cambia la fecha.
- Al recibir un error de cupo al crear la reserva, invalidar y volver a pedir los horarios antes de mostrar el mensaje, para que el horario lleno se vea deshabilitado de inmediato.

**Tiempo real solo del lado del negocio**
- Publicar `experience_bookings` en la publicación de realtime (migración idempotente).
- Nuevo hook `useExperienceBookingsRealtime(businessId)` en `useExperiences.ts`, suscrito a los cambios de reservas de esa experiencia/negocio, invalidando `["experience-bookings", "business", ...]` y la disponibilidad; limpieza del canal al desmontar.
- Usarlo únicamente en la vista de gestión de experiencias del negocio, no en la vista de los usuarios (mismo criterio de costo que en reservas de mesa).

**Sin cambios**
- No se toca la lógica de cupos ni el bloqueo del servidor: ya es correcta.
- No se agrega realtime para invitados.
- No hay rediseño visual.

## Notas técnicas

- Claves de query afectadas: `["experience-availability", experienceId, date, quantity]` y `["experience-bookings", "business", businessId]`.
- La migración usa `ALTER PUBLICATION supabase_realtime ADD TABLE public.experience_bookings` protegido para no fallar si ya está.
- Los holds de pago siguen expirando por `hold_expires_at`, que ya se filtra en la disponibilidad y en la creación.

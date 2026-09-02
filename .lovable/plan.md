# Reservas: actualización en tiempo real

## Estado actual (verificado)

- La asignación de mesas ya es atómica y segura (row locking en `create_reservation`) — no hay overbooking.
- Pero la UI no se actualiza en vivo: disponibilidad del guest tiene staleTime de 30s y la vista del negocio solo refresca al actuar o re-enfocar.
- `public.reservations` ya está en la publicación `supabase_realtime`, pero ningún hook se suscribe. `restaurant_tables`, `reservation_schedules` y `reservation_waitlist` no están publicadas.

## Cambios

### 1. Suscripción a cambios de reservas (guest)
- En `useSlotAvailability` (o un hook nuevo `useReservationRealtime(businessId, date)`): `useEffect` que abre un canal `postgres_changes` sobre `reservations` filtrado por `business_id`, y al recibir un evento invalida `["slot-availability"]` e `["reservations"]`.
- El canal se crea y destruye dentro del `useEffect` (cleanup con `supabase.removeChannel`) — nunca a nivel de componente.
- Se mantiene el RPC como fuente de verdad; realtime solo dispara refetch (evita duplicar la lógica de disponibilidad en el cliente).

### 2. Suscripción en la vista del negocio (Gestión > Reservas)
- Mismo patrón en `ReservasGestionTab`: canal filtrado por `business_id`; al llegar un INSERT/UPDATE/DELETE se invalida `["reservations", "business", businessId, date]` para que la lista del día y los totales se actualicen solos.
- Esto aprovecha que `reservations` ya está publicada — cero migración para los pasos 1 y 2.

### 3. Publicar tablas de inventario restantes (migración chica)
- `ALTER PUBLICATION supabase_realtime ADD TABLE` para `restaurant_tables` y `reservation_schedules`, con suscripciones ligeras en el editor de mesas/horarios para que dos sesiones del mismo negocio no se pisen.
- `reservation_waitlist` se publica también (ya usada o futura).

### 4. Costo controlado
- Canales filtrados por `business_id` (y fecha cuando aplica) para no recibir ruido de toda la tabla.
- Los hooks existentes ya tienen RLS, así que cada suscriptor solo recibe filas que puede leer.
- Throttle: los refetches usan el queryClient con el staleTime actual, así que ráfagas de eventos colapsan en una sola recarga.

## Fuera de alcance
- No se reescribe la lógica de disponibilidad en el cliente.
- No se agrega realtime a menú ni a otros tabs de gestión (se puede extender después con el mismo patrón).

## Notas técnicas
- Archivos: `src/hooks/useSlotAvailability.ts`, `src/hooks/useReservations.ts` (hook nuevo compartido), `src/components/business/ReservasGestionTab.tsx`, una migración nueva en `supabase/migrations/`.
- Sin cambios de UI visibles — solo frescura de datos.

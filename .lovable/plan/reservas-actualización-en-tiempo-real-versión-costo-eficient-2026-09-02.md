# Reservas: actualización en tiempo real (versión costo-eficiente)

## Estado actual (verificado)

- La asignación de mesas ya es atómica y segura (row locking en `create_reservation`) — no hay overbooking.
- La UI no se actualiza en vivo: disponibilidad del guest tiene staleTime de 30s y la vista del negocio solo refresca al actuar o re-enfocar.
- `public.reservations` ya está en la publicación `supabase_realtime`, pero ningún hook se suscribe.

## Decisión de costo

Realtime factura por conexión concurrente + mensajes. Por eso:

- **Guests: NO realtime.** La corrección ya está garantizada server-side (row locking). Si un turno se llena entre que el guest lo vio y confirma, `create_reservation` devuelve error y la UI muestra el mensaje amigable y re-carga disponibilidad. Costo de realtime para miles de guests no justifica el beneficio.
- **Negocio (Gestión > Reservas): SÍ realtime.** Pocas conexiones concurrentes (solo dueños mirando su día) y alto valor operativo: la reserva de un guest aparece al instante.

## Cambios

### 1. Realtime solo en la vista del negocio
- Hook nuevo `useReservationRealtime(businessId, date)` en `src/hooks/useReservations.ts`:
  - `useEffect` abre canal `postgres_changes` sobre `reservations` filtrado por `business_id` (+ `reservation_date` cuando aplica).
  - Ante INSERT/UPDATE/DELETE invalida `["reservations", "business", ...]` y `["slot-availability"]`.
  - Cleanup con `supabase.removeChannel` — nunca a nivel de componente.
  - Solo se activa cuando el viewer es el dueño del negocio (se monta únicamente en la vista de gestión).
- Integración en `ReservasGestionTab.tsx` — una línea.
- `reservations` ya está publicada: **cero migración** para este paso.

### 2. Guests: refetch más inteligente, sin realtime
- En `ReservationSheet`: invalidar `["slot-availability"]` al abrir el sheet y al cambiar de fecha (hoy depende del staleTime de 30s).
- Ante error de booking por capacidad, ya existe el mensaje amigable — se agrega refetch automático de disponibilidad en ese camino.

### 3. Publicar tablas de inventario restantes (migración mínima)
- `ALTER PUBLICATION supabase_realtime ADD TABLE` para `restaurant_tables` y `reservation_schedules`.
- Suscripciones ligeras solo en los editores de mesas/horarios (dueño del negocio, pocas conexiones), para que dos sesiones del mismo negocio no se pisen.
- `reservation_waitlist` se deja fuera por ahora (feature pausada).

## Fuera de alcance
- Sin realtime para guests, menú, ni otros tabs.
- Sin reescribir la lógica de disponibilidad en el cliente — realtime solo dispara refetch del RPC existente.

## Notas técnicas
- Archivos: `src/hooks/useReservations.ts` (hook nuevo), `src/components/business/ReservasGestionTab.tsx`, `src/components/reservations/ReservationSheet.tsx`, una migración chica en `supabase/migrations/`.
- Costo estimado: un puñado de conexiones concurrentes (solo negocios activos en su pestaña Reservas) — despreciable vs. realtime para todos los guests.
- Sin cambios visuales de UI — solo frescura de datos.

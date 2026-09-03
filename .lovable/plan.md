# Lounge manager: construir sobre el sistema de venue layouts existente

En lugar de crear un sistema paralelo (lounge_plans / event_lounge_inventory / lounge_bookings), extendemos el sistema de planos ya construido: `venue_layouts` + `venue_layout_areas` (catálogo reutilizable), `event_areas` (inventario por evento) y `area_bookings` (reservas con hold atómico de 10 min, ya conectado a `payment_sessions.event_area_id` y al checkout QR/tarjeta).

## Qué ya existe y se reutiliza

- Catálogo reutilizable por negocio con nombre, capacidad, `default_price` y `is_exclusive` (`venue_layout_areas`).
- Inventario por evento con precio propio (`event_areas`), plantillas aplicables al crear el evento.
- Reserva atómica `hold_event_area` con expiración, y `confirm_free_area_booking` para áreas gratis.
- Checkout existente: `payment_sessions.event_area_id` ya pasa por `generate-qhantuy-qr`, tarjeta y `qhantuy-callback` con el split 94/6.

## Base de datos (una migración)

- `venue_layout_areas`: agregar `included_tickets integer` nullable (0/NULL = sin entradas incluidas).
- `event_areas`: agregar `included_tickets integer` nullable (override por evento).
- `area_bookings`: agregar `included_tickets integer NOT NULL DEFAULT 0` (snapshot), `cancelled_by text CHECK (cancelled_by IN ('user','business'))`, `cancellation_reason text`, y estados `checked_in` / `no_show` si no existen.
- `guestlist_entries`: agregar `area_booking_id uuid` nullable para rastrear las entradas generadas.
- En `qhantuy-callback` (código, no SQL): al confirmar un pago de área con `included_tickets > 0`, generar esas `guestlist_entries` ligadas al comprador y a `area_booking_id`, para que la puerta use el mismo escáner.
- Trigger de cancelación siguiendo el patrón de `handle_reservation_status_change`: al cancelar/liberar, notificar a la contraparte según `cancelled_by` (cancelación del negocio: sin notificación in-app al invitado).

## Pantallas

1. **Manager del catálogo** — subsección oculta en Business Settings (`/settings/business/layouts`, reactivar `showVenueLayouts`): lista de planos guardados con sus áreas; editar nombre, capacidad, precio sugerido y entradas incluidas por área. Patrón de `TablesEditor.tsx` (lista, switch activo, borrar), sin canvas obligatorio.

2. **Adjuntar al evento** — `EventVenueLayoutSection` ya existe en crear/editar evento: sumar campo "entradas incluidas" por área (precargado del plano, editable) en `AreaEditSheet`, y una alternativa "solo lista" (sin canvas) para agregar áreas rápidamente tipo TablesEditor.

3. **Reserva del invitado en la página del evento** — tarjetas por área con nombre, precio, capacidad y "incluye N entradas" (solo si > 0); agotadas deshabilitadas. Reutiliza el flujo actual de hold + checkout QR/tarjeta; sin ruta de pago paralela.

4. **Gestión por evento** — sección en la gestión del evento: tarjetas por reserva (comprador, área, tamaño de grupo, entradas incluidas, monto, hora), acciones "Check in" y "Cancelar" (hoja que exige `cancelled_by` + motivo), y resumen reservas vs capacidad con realtime sobre `area_bookings` / `event_areas`.

## Detalles técnicos

- Migración única: columnas nuevas (todas nullable o con DEFAULT — cero downtime), trigger de cancelación, GRANTs donde falten y `ALTER PUBLICATION supabase_realtime ADD TABLE area_bookings` si aún no está.
- Hooks: extender `useVenueLayouts.ts` con `useEventAreaBookings`, `useSetAreaBookingStatus` y realtime owner-only, siguiendo `useReservationConfigRealtime`.
- `showVenueLayouts` pasa a `true` solo en Business Settings para acceder al manager; la sección de plano en crear evento queda opcional como hoy.

## Fuera de alcance

- Reservas de lounge sin evento.
- Escrow, depósitos o reembolsos automáticos.
- Nombres por invitado al reservar.
- Recargo si el grupo supera las entradas incluidas — hueco conocido.

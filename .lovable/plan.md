# Lounge manager para eventos

Sistema de mesas/lounges para eventos, en dos capas: un catálogo reutilizable a nivel negocio y el inventario por evento, con reserva pagada y check-in en la misma puerta que las entradas normales.

## Nota sobre lo que ya existe

El proyecto ya tiene un sistema de áreas visual (`event_areas` + `area_bookings`, con planos y posiciones), pero está oculto (`showVenueLayouts = false` en Business Settings) y depende del editor visual de planos. El lounge manager que se describe acá es la versión sin plano visual (solo lista), así que se construyen tablas nuevas según lo pedido y el sistema visual queda intacto y sigue oculto.

## Base de datos

Tres tablas nuevas, con las mismas convenciones que `restaurant_tables` / `reservations`: RLS por `auth.uid()`, trigger `update_updated_at_column()`, GRANTs explícitos y publicación en realtime.

- `lounge_plans` — catálogo del negocio: nombre, capacidad, entradas incluidas (opcional), precio sugerido (opcional), activo, orden. Lectura pública, escritura solo del dueño.
- `event_lounge_inventory` — plan atado a un evento: precio, entradas incluidas, inventario total y disponible, activo. Único por (evento, plan). Lectura pública, escritura del creador del evento.
- `lounge_bookings` — la reserva pagada: inventario, evento, negocio, comprador, tamaño de grupo, entradas incluidas (snapshot), monto, sesión de pago, estado (`confirmed` / `checked_in` / `cancelled` / `no_show`), `cancelled_by` (`user` / `business`) y motivo.
- `guestlist_entries` suma una columna nullable `lounge_booking_id` para rastrear las entradas generadas por un lounge.
- `payment_sessions` suma una columna nullable `event_lounge_inventory_id` para poder cerrar el pago contra el inventario correcto.

Lógica en base de datos:

- RPC `book_lounge(...)` con lock de fila sobre el inventario: valida `available_inventory > 0`, descuenta 1, inserta la reserva y genera las `guestlist_entries` incluidas — todo en la misma transacción.
- Trigger de cancelación: al pasar a `cancelled` o `no_show`, devuelve 1 al inventario y, siguiendo el mismo patrón que `handle_reservation_status_change`, notifica a la contraparte según `cancelled_by` (cancelación del negocio: sin notificación in-app al invitado, el negocio contacta directo).

## Pantallas

1. **Gestor de lounge plans** (nueva subsección oculta en Business Settings, `/settings/business/lounges`): misma estética y patrón de `TablesEditor.tsx` — lista con nombre, capacidad, entradas incluidas, precio sugerido, switch de activo y borrar; alta rápida arriba; realtime con un hook nuevo `useLoungeConfigRealtime` calcado de `useReservationConfigRealtime`.

2. **Adjuntar planes al evento**: dentro del flujo de crear/editar evento, junto a `TicketTiersEditor`, un bloque donde el negocio elige planes existentes y define precio, entradas incluidas (precargadas del plan, editables) e inventario total para ese evento.

3. **Reserva del invitado en la página del evento**: tarjetas seleccionables con nombre, precio, capacidad y "incluye N entradas" (solo si aplica); las agotadas se ocultan/deshabilitan. Resumen de orden y "Pagar y reservar" por el mismo checkout de `payment_sessions` (QR y tarjeta), sin ruta de pago paralela.

4. **Gestión de reservas de lounge por evento** (nueva pestaña/sección en la gestión del evento): tarjetas con comprador, plan, tamaño de grupo, entradas incluidas, estado de pago, monto y hora; acciones "Check in" y "Cancelar" (hoja que exige elegir `cancelled_by` y escribir motivo). Arriba, resumen reservas vs inventario, en vivo por realtime.

## Detalles técnicos

- Migración única con las tres tablas + columnas nuevas + GRANTs + RLS + policies + triggers + `ALTER PUBLICATION supabase_realtime`.
- Hooks nuevos en `src/hooks/useLounges.ts`: planes (CRUD), inventario por evento (CRUD), disponibilidad pública, reservas por evento y mutación de estado.
- Checkout: se extiende `generate-qhantuy-qr` y el flujo de tarjeta con el caso lounge (monto = precio del inventario), y `qhantuy-callback` llama a `book_lounge` al confirmar el pago, igual que hoy hace con entradas y experiencias. Comisión y payout siguen el split 94/6 actual.
- Check-in reutiliza `guestlist_entries` y el escáner existente, así que la puerta no cambia de flujo.

## Fuera de alcance (según lo pedido)

- Reservas de lounge sin evento asociado.
- Escrow, depósitos o reembolsos automáticos.
- Captura de nombres por invitado al reservar.
- Recargo cuando el grupo supera las entradas incluidas — queda como hueco conocido.

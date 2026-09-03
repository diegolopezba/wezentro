# Reservas de lounge visibles en Gestión > Eventos (en tiempo real)

Hoy el seguimiento de lounges vendidos existe, pero está escondido: hay que abrir el menú de tres puntos del evento y tocar "Reservas de lounge". Además, la tarjeta del evento no muestra nada sobre áreas vendidas. Este plan hace el tracking visible directamente en la pestaña Eventos, con actualización en tiempo real.

## Qué cambia

### 1. Resumen de lounges en cada tarjeta de evento

En `src/components/business/EventosGestionTab.tsx`, cada tarjeta de evento que tenga áreas vendibles muestra una fila adicional (icono `Armchair`):

- **"Lounges: 3/8 vendidos · Bs. 450"** — áreas confirmadas/check-in vs total de áreas vendibles del evento, más el bruto vendido en lounges.
- La fila es tocable: abre directamente el `EventAreaBookingsSheet` existente (el detalle con comprador, respuestas, check-in y cancelación), sin pasar por el menú de tres puntos.
- Si el evento no tiene áreas, no se muestra nada (sin ruido visual).

La acción "Reservas de lounge" del menú de tres puntos se mantiene como atajo.

### 2. Datos agregados por evento (un solo query)

Nuevo hook `useEventAreaSalesSummary(eventIds)` en `src/hooks/useVenueLayouts.ts`:

- Un query sobre `area_bookings` filtrado por los `event_id` de la lista, trayendo `event_id, status, total_price`.
- Un query sobre `event_areas` (sellables, `is_decor = false`) para el total de áreas por evento.
- Se agrupa en cliente: por evento → `{ sold, totalAreas, gross }` (sold = `confirmed` + `checked_in`; excluye `held`, `cancelled`, `no_show`).
- Query keys: `["area-sales-summary", eventIds]` con staleTime corto.

### 3. Tiempo real (costo-eficiente, patrón ya usado)

- Un solo canal `postgres_changes` sobre `area_bookings` (sin filtro por evento, el tab ya es solo para el negocio dueño) mientras la pestaña Eventos está montada, que invalida `["area-sales-summary"]` y `["event-area-bookings"]`.
- Sigue el patrón aprobado de `useReservationRealtime`: solo dueños, pocas conexiones concurrentes, cleanup con `removeChannel`.
- `area_bookings` ya está en la publicación `supabase_realtime` (migración anterior), así que **no hay migración nueva**.

## Detalles técnicos

- Archivos: `src/hooks/useVenueLayouts.ts` (hook de resumen + hook realtime de lista), `src/components/business/EventosGestionTab.tsx` (fila en la tarjeta + apertura directa del sheet).
- Reutiliza `EventAreaBookingsSheet` sin cambios internos (ya tiene realtime propio al abrirse).
- Sin cambios de base de datos, RLS ni edge functions.
- Tema claro de Gestión, pills/rounded existentes, sin `hover:` (solo `active:`).

## Fuera de alcance

- No se toca el sheet de detalle de reservas de lounge (ya muestra comprador, respuestas, check-in, cancelar).
- Sin notificaciones push al negocio por cada venta (se puede evaluar aparte).

# Detalle del evento dentro de la pestaña Eventos

La pestaña Eventos deja de ser una lista para convertirse en la pantalla de operación del evento seleccionado, con un selector de eventos en píldoras arriba.

## Qué se construye

### 1. Selector de eventos en píldoras

Debajo de las pestañas de Gestión, una fila horizontal scrolleable con el nombre de cada evento (una píldora por evento, estilo pill ya usado en la app, la activa en negativo).

- Orden cronológico: eventos pasados a la izquierda, próximos a la derecha.
- Al entrar, el próximo evento queda seleccionado y su píldora posicionada a la izquierda del scroll (con los pasados accesibles deslizando hacia la izquierda).
- Cada píldora muestra el título (truncado) y la fecha corta; los pausados llevan un punto ámbar.
- La selección se guarda en el estado de la pestaña, así que cambiar de evento no recarga la página.

### 2. Contenido: el detalle del evento, inline

Debajo del selector se renderiza exactamente lo que hoy vive en `/business/event/:eventId`:

- Cabecera resumen: imagen, título, fecha, badge Publicado/Pausado y los tres bloques (vendidas/capacidad, neto con bruto debajo, conversión).
- Menú de tres puntos con las acciones actuales (pausar/reanudar, editar, compartir, invitados, reservas de lounge).
- Pestañas internas: Entradas / Lounges (solo si el evento tiene áreas vendibles) / Invitados / Promotores, sin cambios en su lógica.

La lista de tarjetas actual desaparece de esta pestaña; su información (vendidos, neto, conversión, lounges) ya está toda en la cabecera del detalle.

### 3. Estados vacíos

Sin eventos: se mantiene la tarjeta actual con el botón "Crear evento". Mientras carga, skeletons de píldoras + cabecera.

### 4. Ruta existente

`/business/event/:eventId` se mantiene tal cual (enlaces y navegación desde otros puntos siguen funcionando); pasa a compartir el mismo componente de detalle que la pestaña.

## Detalles técnicos

- Nuevo hook `useBusinessAllEvents(userId)` en `src/hooks/useEvents.ts`: mismos filtros que `useBusinessUpcomingEvents` (creator, `is_post = false`, sin borrar) pero sin el corte `gte(start_datetime, now)`, orden ascendente. Se limita a los últimos ~30 pasados + todos los próximos para no traer historial infinito.
- El cuerpo de `src/pages/BusinessEventDetail.tsx` se extrae a `src/components/business/EventDetailPanel.tsx` que recibe `eventId` como prop; la página queda como envoltorio con header/back y la pestaña lo usa sin header.
- `EventosGestionTab.tsx` pasa a: hook de eventos → fila de píldoras (`overflow-x-auto`, `scrollIntoView` sobre la píldora activa al montar) → `EventDetailPanel`. Los sheets de acciones/editar/invitados/lounge se mueven al panel de detalle (donde ya conviven con la cabecera).
- Sin cambios de backend, sin migraciones, sin nuevas agregaciones: se siguen usando `get_creator_sales_by_event`, `event_stats`, `useTicketBreakdown`, `useEventAreas`/`useEventAreaBookings` y `useEventGuestlist`.

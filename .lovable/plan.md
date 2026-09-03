# Pantalla de detalle de evento (Gestión › Eventos)

Nueva pantalla para operar un evento desde el celular: cabecera con la salud del evento en 5 segundos y pestañas para entradas, lounges, invitados y promotores.

## Qué se construye

### 1. Nueva ruta `/business/event/:eventId`
- Página `BusinessEventDetail.tsx` con cabecera resumen + pestañas.
- En `EventosGestionTab.tsx` solo cambia el destino de los taps (imagen, título y acción "Ver promotores") de `/business/event/:id/promoters` a `/business/event/:id`. El resto de la lista queda igual.
- La ruta antigua `/business/event/:eventId/promoters` se mantiene (enlaces existentes) pero deja de ser el destino principal.

### 2. Cabecera resumen (siempre visible)
Imagen, título, fecha, badge Publicado/Pausado (mismo estilo que la tarjeta de la lista) y tres bloques: entradas vendidas / capacidad, neto (`netOf` + `formatBs`, con bruto pequeño debajo) y conversión. Datos de la fila de `get_creator_sales_by_event` (`useCreatorSalesByEvent`) y de `event_stats.view_count`, exactamente como ya los calcula la lista.

### 3. Pestañas
Se usan `Tabs/TabsList/TabsTrigger/TabsContent` siguiendo el patrón de `GuestlistManagementSheet.tsx`.

**Entradas** — una fila por tier con nombre, precio, barra fina `sold/capacity`. Sin capacidad: solo el número vendido, sin barra. Al 100%: barra en `bg-destructive` y etiqueta "Agotado"; a partir del 85%: `bg-amber-500` y etiqueta "Casi agotado". Datos vía el hook existente `useTicketBreakdown(eventId)`.

**Lounges** — pestaña visible solo si el evento tiene áreas vendibles. Una fila por área (`useEventAreas` + `useEventAreaAvailability`) con nombre, precio y ocupación con el mismo tratamiento de color. Al tocar una fila se expande con sus reservas (comprador, personas, estado de pago/check-in) tomadas de `useEventAreaBookings`, con realtime vía `useEventAreaBookingsRealtime`. Las acciones completas (check-in, cancelar) siguen abriéndose en el `EventAreaBookingsSheet` ya existente.

**Invitados** — buscador arriba (mismo patrón del sheet actual), lista desde `useEventGuestlist(eventId)` con nombre, tipo de entrada o área y estado de check-in. Las entradas generadas por una reserva de lounge se agrupan bajo el comprador ("Camila Rojas +5") usando `guestlist_entries.area_booking_id`. Pie con total de invitados, check-ins y botón de exportar (XLSX, reutilizando `downloadXlsx` de `src/lib/inviteImport.ts`, igual que `SpecialInvitesPanel`).

**Promotores** — se renderiza el contenido actual de `EventPromoterDashboard` sin tocar su lógica: se extrae su cuerpo a un componente `EventPromotersPanel` y tanto la ruta antigua como esta pestaña lo usan.

## Detalles técnicos

- Estado actual verificado: `guestlist_entries` tiene `area_booking_id` y `checked_in_at`; no existe una tabla `event_lounge_inventory` — el inventario de lounges vive en `event_areas` / `area_bookings`, así que la pestaña Lounges se construye sobre esos hooks ya existentes.
- Check-in de invitados: hoy **no** existe un toggle manual en `GuestlistManagementSheet`; el único camino de escritura es la edge function `check-in-guest` que usa el `scanner_access_token` del evento (pantalla `/scan`). Para no crear un segundo camino, el toggle de esta pantalla llamará a esa misma edge function con el token del evento. Si preferís que no haya check-in manual aquí, se muestra el estado en solo lectura y se deja el escaneo como único método.
- Sin nuevas funciones de agregación ni migraciones: todo sale de `ticket_tiers`, `guestlist_entries`, `event_areas`/`area_bookings` y `get_creator_sales_by_event`.
- Sin gráficos de analítica en esta entrega.
- Acceso: misma protección que la página de promotores (dueño del evento + cuenta business).

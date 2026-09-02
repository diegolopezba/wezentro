# Rediseño de la pestaña Reservas en Gestión (BusinessHub)

Convertir la pestaña "Reservas" de la página Gestión (`/business-hub`) en una vista operativa por día: calendario, totales del día y lista cronológica de reservas. Las analíticas históricas (7/30/Todo, tasa de cancelación, días que más se llenan) se quedan exclusivamente en `/dashboard`, que usa el mismo componente hoy.

## Alcance

Solo la pestaña Reservas dentro de `BusinessHub.tsx`. `BusinessDashboard.tsx` sigue usando el `ReservasTab` actual sin cambios.

## Cambios

### 1. Nuevo componente `src/components/business/ReservasGestionTab.tsx`

Reemplaza al `ReservasTab` dentro de `BusinessHub` (se crea uno nuevo en vez de modificar el actual, para no romper el dashboard analítico).

**Header**

- Título "Reservas" a la izquierda.
- A la derecha (en lugar del PeriodSelector 7d/30d/Todo): un toggle de vista tipo pill con dos opciones: **Día** y **Semana**, más un botón de calendario (Popover con el `Calendar` existente) para saltar a cualquier fecha.

**Vista Día (por defecto)**

- Calendario mensual inline (componente `Calendar` / react-day-picker ya existente) con la fecha seleccionada; los días con reservas muestran un indicador (punto/contador pequeño).
- Flechas ‹ › junto a la etiqueta de fecha ("Hoy", "Mañana", "mar 3 sep") para avanzar/retroceder un día.

**Vista Semana**

- Tira horizontal de 7 días (dom–sáb, etiquetas `DAYS_ES`) con el número de reservas por día; al tocar un día se selecciona y se muestra su agenda. Flechas ‹ › para cambiar de semana.

**Totales compactos (ambas vistas)**

- Una sola línea pequeña bajo el calendario/semana: "N reservas · M personas" para el día seleccionado (excluye canceladas). Sin StatsCards grandes.

**Lista cronológica del día**

- Tarjetas de reserva ordenadas por `reservation_time` ascendente, solo del día seleccionado.
- Cada tarjeta muestra:
  - Izquierda: avatares circulares apilados (owner + invitados de `reservation_guests`), máximo 3; si hay más, un burbuja "+N".
  - Nombre de quien reservó (`full_name || username`).
  - Hora (`HH:mm`), party size ("4 personas") y notas si existen (truncadas a 1 línea).
  - Badge de estado cuando no es `confirmed` (Sentada / Completada / No-show / Cancelada).
- Al tocar una tarjeta se abre un bottomsheet de detalle con las acciones ya existentes: Sentada, Completar, No-show, Mensaje, Cancelar (se extrae la lógica de acciones de `ReservationsManagementSheet` en un `ReservationDetailSheet` reutilizable, sin duplicar mutaciones).

### 2. Datos

- Nueva variante del query de reservas del negocio filtrable por rango de fechas (día seleccionado o semana visible) en `useReservations.ts`: `useBusinessReservationsByDate(businessId, from, to)` — mismo select con perfil e invitados, `.gte("reservation_date", from).lte("reservation_date", to)`, incluye canceladas para mostrarlas con su badge.
- Para los indicadores del calendario mensual: query ligera de conteos por día del mes visible (solo `reservation_date`, `party_size`, `status`).
- Los invitados se cargan junto con la lista (join a `reservation_guests` + profiles) en una sola consulta para evitar N+1 por tarjeta.

### 3. BusinessHub.tsx

- La pestaña "reservas" pasa a renderizar `ReservasGestionTab`; se elimina el estado `period` si ya no se usa en otras pestañas (Ventas tiene su propio selector).

### 4. Limpieza

- `ReservationsManagementSheet` queda como estaba (se usa en otras vistas) pero sus acciones se extraen a un hook/componente compartido para que el nuevo `ReservationDetailSheet` las reuse. Si la extracción complica, el detail sheet nuevo llama directamente a `useSetReservationStatus` / `useCancelReservation` / `useCreatePrivateChat` (mismas mutaciones, código corto).

## Notas técnicas

- Sin cambios de base de datos ni migraciones: `reservations` y `reservation_guests` ya tienen todo lo necesario.
- Fechas con `date-fns` + locale `es`, igual que el resto de la app; `reservation_date` se compara como string `yyyy-MM-dd`.
- Estilo acorde al sistema: dark theme, pills rounded-full, `active:` en vez de `hover:`, sin clases hover.
- La pestaña Ventas y Experiencias de Gestión no se tocan en este pase.
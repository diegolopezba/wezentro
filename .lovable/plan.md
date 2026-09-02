# Timeline vertical y filtros de estado en Reservas (Gestión)

Mejorar la pestaña Reservas de `/business-hub` para que el negocio lea el día de un vistazo: agenda vertical agrupada por hora, estados con color y filtros por estado.

## Cambios (solo `src/components/business/ReservasGestionTab.tsx`)

### 1. Timeline vertical por hora

- Las reservas del día seleccionado se agrupan por `reservation_time` (HH:mm). Solo se renderizan las horas que tienen al menos una reserva visible; las franjas vacías no aparecen.
- Cada grupo muestra una cabecera de hora a la izquierda (columna fija estrecha, ej. "20:30") con una línea vertical y un punto por grupo, y a la derecha las tarjetas de esa hora.
- Orden: cronológico ascendente. Si el día seleccionado es hoy, el timeline arranca en la franja actual (las horas ya pasadas se muestran debajo, colapsadas bajo un texto pequeño "Ver N horas anteriores"); en otros días se muestra todo desde la primera hora.
- Se marca la franja actual con un indicador "ahora" (línea + etiqueta) cuando el día es hoy.

### 2. Colores por estado

Las pills de estado en la tarjeta pasan a tener color propio, usando tokens semánticos del design system (nada hardcodeado):

- Confirmada: sin pill (estado por defecto), como hoy.
- Sentada: verde suave (fondo tenue + texto).
- Completada: azul/neutro oscuro suave.
- No-show: ámbar.
- Cancelada: destructive suave.

Se define un mapa `STATUS_STYLE` con clases de token para fondo/texto, junto al `STATUS_LABEL` existente.

### 3. Filtros pill de estado

- Fila horizontal de pills bajo los totales: **Activas** (por defecto), **Sentadas**, **Completadas**, **No-shows**, **Canceladas**.
- "Activas" = `confirmed` + `seated`: es decir, completadas, no-shows y canceladas salen de la vista por defecto una vez marcadas, dejando solo lo operativo.
- Cada pill muestra su contador del día; las pills con 0 se pueden seleccionar igual (mostrarán el estado vacío).
- Estilo consistente con las pills existentes: `rounded-full`, seleccionado en `bg-foreground text-background`, `active:` en vez de `hover:`.

### 4. Totales

La línea compacta "N reservas · M personas" sigue reflejando el día completo sin canceladas (no cambia con el filtro), para que el negocio no pierda el total real del día.

## Notas técnicas

- Sin cambios de base de datos, hooks ni queries: se sigue usando `useBusinessReservationsByDate` + `useReservationRealtime`; todo el agrupado y filtrado es en cliente con `useMemo`.
- El detalle de la reserva sigue abriéndose con `ReservationDetailSheet` sin cambios; al cambiar un estado desde ahí, la fila desaparece del filtro "Activas" automáticamente por invalidación de query.
- Tema claro de las páginas de negocio y estilo pill actual se mantienen; sin clases `hover:`.

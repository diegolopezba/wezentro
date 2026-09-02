# Pestaña "Eventos" en Gestión (reemplaza Ventas)

## Qué cambia

1. La pestaña `Ventas` de Gestión pasa a llamarse **Eventos**.
2. Se eliminan de esa vista: el bloque "Neto estimado · histórico", el gráfico "Neto en el tiempo" y el donut "Origen de los ingresos".
3. En su lugar queda un **panel de gestión de eventos próximos**: una lista de los eventos futuros del negocio, cada uno con sus métricas clave y acciones rápidas.

## Cómo se ve cada evento

Tarjeta (basada en la actual "Tickets por evento", mejorada):

- Imagen, título y fecha/hora.
- Estado: **Publicado** o **Pausado** (píldora de color).
- Neto estimado y bruto.
- Vendidos `X/Capacidad` con barra de progreso, check-ins, conversión (vistas → compras) y tickets vía promotores.
- Botón de tres puntos que abre una hoja inferior (light sheet) con:
  - **Pausar / Reanudar** — oculta el evento del feed y de búsqueda (deja de ser público). No borra nada y se puede reanudar.
  - **Editar** — abre la hoja de edición del evento.
  - **Compartir / copiar link** — copia el enlace público.
  - **Ver promotores** y **Check-in** — atajos a esas páginas.
- Tocar la tarjeta sigue llevando al detalle de promotores/ventas del evento.

Si no hay eventos próximos: estado vacío con un botón para crear uno.

## Alcance

- Solo eventos **próximos** (fecha de inicio futura). Los pasados no se listan aquí.
- Se incluyen eventos pausados (no públicos) para poder reanudarlos.
- No se toca la pestaña Promotores ni la página `Ventas y promotores` existente, que conserva resumen, gráficos y atribución.

## Detalles técnicos

- `src/pages/BusinessHub.tsx`: renombrar el tab `ventas` → etiqueta "Eventos" (id interno `eventos`), renderizando el nuevo componente.
- `src/components/dashboard/SalesTab.tsx`: se reemplaza por `src/components/business/EventosGestionTab.tsx` (o se reescribe) sin `SalesSummary`.
- Nuevo hook `useBusinessUpcomingEvents` en `src/hooks/useEvents.ts`: eventos del creador con `is_post = false`, `deleted_at is null`, `start_datetime >= now()`, orden ascendente; se combina con `useCreatorSalesByEvent` (tickets, ingresos, capacidad, check-in, atribuidos) y con `event_stats.view_count` para la conversión, igual que hoy en `SalesEvents`.
- Pausar/reanudar: `update events set is_public = false/true` vía una mutación nueva en `src/hooks/useEventMutations.ts`, invalidando `events`, `for-you-events`, `nearby-events`, `following-events`, `user-timeline` y la query del panel. Optimistic UI + haptics + toast.
- La hoja de acciones usa `Sheet`/`SheetContent` con `light-sheet` y radio 24px, como el resto de bottom sheets.
- `SalesSummary` sigue existiendo para `BusinessSales.tsx`; no se borra el componente.

## Fuera de alcance

Sin cambios en cálculo de comisiones, RPCs de ventas, promotores ni en la pestaña Reservas/Experiencias.

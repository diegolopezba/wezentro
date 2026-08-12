# Filtros de categoría en el home feed

Traer la misma experiencia de filtros de la página de explorar (mapa) al home, ocultando la pestaña "Siguiendo".

## Qué cambia en pantalla

- La fila de pestañas del home pasa a ser una sola fila horizontal de pills scrollable:
  `Para Ti` (activo por defecto) + `Fiesta, Bar, Concierto, Festival, Rooftop, Restaurante, Café, Fitness, Arte y Cultura`, con los mismos emojis y estilo pill que en explorar.
- La pestaña "Siguiendo" se oculta (código conservado, sin ruta visible).
- En el header, junto al ícono de búsqueda, se agrega un ícono de filtros (SlidersHorizontal) que abre el mismo bottomsheet `FilterSheet` de explorar (Fecha, Distancia, Amigos asistiendo), con badge de conteo cuando hay filtros activos.

## Comportamiento

- `Para Ti` = feed actual servido por el servidor (sin cambios).
- Al tocar una o más categorías, el home cambia a modo "explorar": muestra los eventos que cumplen los filtros, usando el mismo catálogo y la misma lógica de filtrado que la página de mapa. Esto es necesario porque el feed Para Ti llega paginado desde el servidor y filtrar solo lo cargado dejaría resultados incompletos.
- Tocar de nuevo una categoría la desactiva; sin categorías activas y sin filtros del sheet, vuelve a `Para Ti`.
- Los filtros del bottomsheet (fecha, distancia, amigos) también activan el modo filtrado, aunque no haya categoría seleccionada.
- La búsqueda por texto existente sigue funcionando sobre el listado visible.
- Los resultados filtrados se muestran en el mismo grid masonry de tarjetas que ya usa el home, para no cambiar la estética.

## Detalles técnicos

- `src/pages/Index.tsx`:
  - Estado nuevo: `filters: FilterOptions` (misma interfaz de `useNearbyEvents`).
  - Ocultar el botón/tab "Siguiendo"; reemplazar la fila de tabs por `Para Ti` + pills de categoría reutilizando la lista de `src/lib/categories.ts` y el estilo de `CategoryFilterBar`.
  - Fuente de datos condicional: `useForYouEvents()` cuando no hay filtros activos; `useNearbyEvents(useEvents(), location, filters, friendsData)` cuando sí los hay.
  - `friendsGoingOnly` requiere las mismas consultas auxiliares que Discover (follows + guestlist_entries); se extraerán a un hook compartido `useFriendsGoingData` para no duplicar el bloque.
  - Reutilizar `FilterSheet` (`@/components/map/FilterSheet`) tal cual, con `SlidersHorizontal` en el header.
  - Transformar los eventos filtrados al mismo shape de card que ya usa `transformedEvents` (extraer la función de mapeo para usarla en ambos modos).
- En modo filtrado no hay paginación infinita (el catálogo se carga por `useEvents`, igual que en explorar); `Para Ti` conserva su scroll infinito.
- Sin cambios de base de datos ni de edge functions.

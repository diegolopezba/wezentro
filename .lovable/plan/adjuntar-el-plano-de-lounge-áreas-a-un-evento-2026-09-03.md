# Adjuntar el plano de lounge (áreas) a un evento

Hoy no hay forma de hacerlo desde la app: la sección "Vender por áreas" existe (`EventVenueLayoutSection`) pero está **comentada** en la página de Crear, y la hoja de **Editar evento** no la incluye. Por eso el catálogo de planos en Ajustes de negocio no se puede usar en ningún evento.

## Qué se hace

1. **Crear evento** — reactivar la sección "Vender por áreas" (solo cuentas business, eventos, no experiencias): switch para activar, elegir un plano guardado del catálogo o armar áreas nuevas, modo lista o canvas, precio / capacidad / entradas incluidas por área. Al publicar, las áreas se guardan en el inventario del evento (la lógica de guardado ya existe y quedó intacta).

2. **Editar evento** — agregar la misma sección en la hoja de edición: cargar las áreas actuales del evento, permitir aplicar un plano guardado, editarlas y guardarlas al presionar "Guardar cambios" (integrado al estado sucio del botón). Si el evento ya tiene reservas de lounge, se avisa antes de reemplazar el inventario y se bloquea borrar áreas con reservas activas.

3. **Punto de entrada claro** — desde Gestión > Eventos, la acción de tres puntos ya tiene "Reservas de lounge"; se añade "Editar áreas" cuando el evento no tiene áreas configuradas, para que el flujo sea evidente.

## Detalles técnicos

- `src/pages/Create.tsx`: descomentar el bloque `EventVenueLayoutSection` (el estado `useAreas`/`draftAreas`, la validación y `replaceEventAreas` ya están cableados).
- `src/components/events/EditEventSheet.tsx`: añadir estado de áreas, cargar con `useEventAreas(event.id)`, incluirlo en `useDirtyBaseline`, y en `handleSave` llamar `useReplaceEventAreas`.
- Guardia de reservas: antes de reemplazar, consultar `area_bookings` con estado `confirmed`/`checked_in` del evento; si existen áreas con reservas, no permitir eliminarlas (solo editar nombre/precio) y mostrar aviso.
- Sin cambios de base de datos: `event_areas`, `venue_layout_areas`, holds y checkout ya soportan todo.

## Fuera de alcance

- Cambiar el editor de canvas o los presets decorativos.
- Reservas de lounge sin evento.

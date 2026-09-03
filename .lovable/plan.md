# Formas y elementos decorativos en el plano del lugar

Dos mejoras al editor visual de áreas:

1. **Forma del área**: el negocio elige entre cuadrado/rectángulo (con esquinas redondeadas) o círculo.
2. **Elementos del plano**: además de las áreas vendibles, se pueden añadir bloques de referencia como Escenario, Barra, Baños, DJ, Entrada o Pista, para que el plano se entienda mejor.

## Cómo se ve para el negocio

En el editor de plano (Ajustes de negocio > Planos del lugar, y al crear/editar un evento):

- Botón **Añadir área** (como hoy, área vendible) y un nuevo botón **Añadir elemento** con opciones rápidas: Escenario, Barra, DJ, Baños, Entrada, Pista, Otro.
- En el bottom sheet **Editar área**, arriba de Color, un selector de **Forma**: Rectángulo / Círculo.
- Al editar un elemento decorativo el sheet se simplifica: solo Nombre, Forma, Color y Rotación (sin capacidad, precio, entradas incluidas ni exclusividad), más Duplicar/Eliminar y el botón Guardar.
- Los elementos se dibujan con relleno gris tenue, borde punteado y su nombre centrado; se arrastran y redimensionan igual que las áreas.

## Para el usuario que reserva

En el selector de áreas del evento, los elementos decorativos se muestran como referencia visual pero **no son seleccionables ni reservables**, y no cuentan en capacidad total ni en disponibilidad.

## Detalles técnicos

**Base de datos** (migración aditiva, sin romper nada):

- `venue_layout_areas` y `event_areas`: añadir `shape TEXT NOT NULL DEFAULT 'rect'` (valores `rect` | `circle`) y `is_decor BOOLEAN NOT NULL DEFAULT false`.
- Regenerar los tipos del backend.
- `get_event_area_availability` y las consultas de capacidad filtran `is_decor = false`.

**Frontend**:

- `useVenueLayouts.ts`: extender `DraftArea` con `shape` e `is_decor`; `makeDraftArea` acepta ambos; incluirlos en los inserts de plantillas y de áreas de evento; nuevo helper `DECOR_PRESETS` (etiqueta + tamaño por defecto) y `makeDecorArea`.
- `VenueGridCanvas.tsx`: `borderRadius: 9999px` cuando `shape === 'circle'`; estilo punteado/gris para decor; en modo no editable, los decor no llaman a `onSelect` y se marcan `pointer-events: none`.
- `AreaEditSheet.tsx`: selector de forma con dos pills; oculta los campos de venta cuando `is_decor`.
- `VenueLayoutEditor.tsx`: botón/menú "Añadir elemento" con los presets; el contador de capacidad ignora los decor.
- `AreaListEditor.tsx` (modo lista): no muestra ni crea decor, ya que ahí no hay plano visual.
- `AreaPicker` del evento: filtra decor de la lista y de los totales.

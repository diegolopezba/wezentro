# Fix: el editor de áreas abre el bottom sheet al intentar arrastrar

## Problema

En `VenueLayoutEditor`, el callback `onSelect` abre el sheet de edición (`setEditingId(id)`). Pero `VenueGridCanvas` llama `onSelect(area.id)` desde `onPointerDown` — es decir, apenas el dedo toca el widget para moverlo o redimensionarlo, el sheet se abre y el gesto se pierde. No existe distinción entre **tocar** (tap) y **arrastrar** (drag).

## Solución

Distinguir tap de drag por distancia recorrida, en dos archivos:

### 1. `src/components/venue/VenueGridCanvas.tsx`
- En `onPointerDown`: ya **no** se llama `onSelect` inmediatamente en modo editable; solo se registra el inicio del gesto (posición inicial).
- En `onPointerMove`: marcar `moved = true` cuando el puntero supera un umbral (~8px). Mover/redimensionar solo cuando el umbral se supera, evitando "saltos" de 1px por el snap al soltar un tap.
- En `onPointerUp`: si el gesto **no** superó el umbral, se considera tap → llamar `onSelect(area.id)`. Si fue drag, solo se cierra el gesto (sin abrir sheet).
- La esquina de resize (`mode: "resize"`) nunca dispara `onSelect` al soltar.
- El tap en el fondo del canvas sigue deseleccionando (`onSelect(null)`).

### 2. `src/components/venue/VenueLayoutEditor.tsx`
- Separar selección de edición: `onSelect` solo marca `selectedId` (resalta el área con el anillo). El sheet de edición se abre con una señal explícita de tap — p. ej. nuevo callback `onAreaTap` del canvas, o abrir el sheet al tocar un área **ya seleccionada** (doble toque implícito: primer tap selecciona, segundo tap edita). Implementación concreta:
  - Primer tap: selecciona el área (ring negro).
  - Tap sobre el área ya seleccionada: abre `AreaEditSheet`.
  - Esto mantiene accesible la edición sin interferir con el arrastre.

### Comportamiento resultante
- Arrastrar para mover → funciona, sin abrir el sheet.
- Arrastrar la esquina para redimensionar → funciona, sin abrir el sheet.
- Tap (sin mover) → selecciona; segundo tap → abre *Editar área*.

## Detalles técnicos
- Umbral de tap: 8px en coordenadas de pantalla (antes de escalar a unidades del canvas).
- Mantener `setPointerCapture` y `touch-none` existentes; no cambia el layout, el snap a grilla (20 unidades) ni los listeners del contenedor.
- El modo no editable (`editable = false`, usado en el picker del invitado) no cambia: ahí el tap sigue llamando `onSelect` directamente para seleccionar el área a reservar.
- Actualizar el texto de ayuda del editor: "Toca un área seleccionada para editarla".
- Verificar con typecheck (`npx tsgo --noEmit`) y prueba manual en preview móvil.

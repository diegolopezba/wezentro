# Hacer scrolleable el sheet "Editar área" (botón Guardar accesible)

## Diagnóstico
- El botón "Guardar cambios" ya existe en `AreaEditSheet.tsx` (agregado antes).
- El problema: `SheetContent` usa vaul, y vaul captura los gestos táctiles sobre todo el contenido del drawer. El contenedor con `overflow-y-auto` es el propio `Drawer.Content`, y en touch el drag del sheet "gana" sobre el scroll — por eso no se puede bajar hasta el botón.

## Fix (solo frontend, 1 archivo)

**`src/components/venue/AreaEditSheet.tsx`** — reestructurar el contenido:

1. `SheetContent` pasa de scrollear él mismo a layout fijo: `flex flex-col max-h-[85dvh] overflow-hidden` (sin `overflow-y-auto`).
2. Header (`SheetHeader` + drag handle) queda fijo arriba — no scrollea.
3. El cuerpo del form (nombre, tipo, capacidad, precio, entradas, exclusiva, color, rotación) va en un `div` interno con `flex-1 overflow-y-auto` **+ `data-vaul-no-drag`** — este atributo le dice a vaul que no capture gestos dentro, dejando el scroll táctil nativo funcionar.
4. Footer fijo abajo (no scrollea) con el botón **Guardar cambios** y los botones Duplicar/Eliminar, con `pb` + safe-area ya incluido por `SheetContent`. Así el Guardar es siempre visible, incluso sin scrollear.

## Resultado
- Arrastrar el handle/header sigue cerrando el sheet con el gesto nativo.
- El form scrollea con el dedo.
- Guardar siempre visible y accesible.

## Verificación
- Typecheck (`npx tsgo --noEmit`).
- Check manual en preview móvil (Playwright viewport pequeño): abrir Editar área, confirmar que el botón Guardar es visible sin scroll y que el form scrollea.

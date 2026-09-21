# Fix: el bottom sheet de mesas y lounges no deja hacer scroll

## Diagnóstico (confirmado leyendo el código)

El problema tiene dos partes, ambas en el flujo de compra:

1. **El mapa del lugar bloquea el scroll.** `VenueGridCanvas.tsx` (el plano con las mesas/áreas) tiene la clase `touch-none` en su contenedor, pensada para el modo *editor* (arrastrar mesas). Pero esa misma clase se aplica en el modo *solo lectura* que usa el sheet de compra. `touch-none` le dice al navegador que ningún gesto táctil sobre el plano hace scroll — y el plano ocupa casi todo el ancho del sheet, así que si el dedo cae sobre el plano, no pasa nada.

2. **El sheet antiguo de selección de área pelea con vaul.** `AreaPickerSheet.tsx` pone `overflow-y-auto` directo sobre el `Drawer.Content` de vaul sin `data-vaul-no-drag`, así que vaul captura el gesto y arrastra/cierra el sheet en vez de scrollear (mismo bug que ya se arregló en `AreaEditSheet`). El `PurchaseFlow.tsx` principal ya tiene la estructura correcta (header fijo + cuerpo con `data-vaul-no-drag`), así que queda bloqueado solo por el punto 1.

## Cambios

**`src/components/venue/VenueGridCanvas.tsx`**
- `touch-none` solo cuando `editable` es `true` (modo editor de planos). En modo lectura (selección de área al comprar) usar `touch-pan-y`: los toques sobre mesas siguen seleccionando (es un click, no un drag), pero deslizar vertical scrollea el sheet.
- En modo lectura, agregar `data-vaul-no-drag` al contenedor del plano para que vaul tampoco interprete esos gestos como arrastre del sheet.

**`src/components/venue/AreaPickerSheet.tsx`**
- Misma reestructura que `AreaEditSheet`/`PurchaseFlow`: `SheetContent` con `max-h-[92dvh] flex flex-col overflow-hidden` (sin `overflow-y-auto`), header fijo arriba, y el contenido en un div interno `flex-1 overflow-y-auto overscroll-contain` con `data-vaul-no-drag`.

Sin cambios en lógica de compra, holds, precios ni en `PurchaseFlow.tsx` (su estructura ya es correcta).

## Verificación
- Typecheck (`npx tsgo --noEmit`).
- Playwright en viewport móvil: abrir el flujo de compra de un evento con plano, scrollear con el dedo sobre el mapa y sobre la lista — debe scrollear sin cerrar el sheet; tocar una mesa sigue seleccionándola; arrastrar desde el header/handle sigue cerrando el sheet.

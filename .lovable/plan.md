# Un solo bottom sheet para todo el flujo de compra

## Qué cambia

Hoy el flujo usa tres sheets distintos que se abren y cierran uno tras otro:

1. Sheet de selección (elegir entrada / lounge, luego tus datos)
2. Sheet de resumen con total y elección de pago (QR o tarjeta)
3. Sheet del QR / confirmación

Pasa a ser **un único bottom sheet** con vistas internas tipo carrusel:

```text
Elegir  →  Tus datos  →  Resumen y pago  →  QR / tarjeta  →  ¡Listo!
   ←          ←              ←
```

- "Continuar" avanza a la siguiente vista dentro del mismo sheet, con una transición horizontal suave.
- La flecha de atrás arriba a la izquierda vuelve a la vista anterior (en la primera vista cierra el sheet).
- En la vista del QR, atrás vuelve al resumen y cancela la espera del pago; en la vista final de éxito ya no hay atrás.
- **Todas las vistas tienen la misma altura**: la del sheet del QR actual (85dvh), con header fijo, contenido scrolleable y footer fijo con el botón.
- Tema claro consistente, igual que ahora.

## Casos que se mantienen igual

- Eventos solo con entradas (sin lounges): mismo sheet, empieza en "Elegir" si hay varios tiers, o directo en el resumen si solo hay una entrada.
- Entradas gratis, invitaciones especiales y compra múltiple con etiquetado de personas: mismas pantallas, ahora como vistas del mismo sheet.
- Áreas/lounges: hold del área, preguntas del organizador y respuestas guardadas se mantienen sin cambios.

## Detalles técnicos

- Extraer el contenido interno de `PaymentQRModal.tsx` a un componente sin `Sheet` (p. ej. `CheckoutSteps`), que reciba `onBack` y renderice los pasos `details | loading | revealed | card | success | expired | error` dentro de un contenedor `flex flex-col h-full`.
- `PaymentQRModal.tsx` queda como wrapper delgado (`Sheet` + `CheckoutSteps`) para los usos independientes: invitación especial y evento sin áreas.
- `PurchaseFlow.tsx` pasa a ser el contenedor único del flujo de evento: mantiene sus pasos `select | details` y agrega `checkout`, montando `CheckoutSteps` en la misma `SheetContent`. `onSelectTier` / `onAreaHeld` dejan de cerrar el sheet: guardan la selección en estado local y avanzan a `checkout`.
- `SheetContent` con `h-[85dvh] flex flex-col p-0` y todos los pasos con `flex-1 min-h-0 overflow-y-auto` + `data-vaul-no-drag`.
- Transición entre vistas con `AnimatePresence` (slide horizontal + fade), respetando el estilo nativo ya usado en la app.
- `EventDetail.tsx` y `EventDetailModal.tsx`: dejan de abrir `PaymentQRModal` cuando el flujo viene de `PurchaseFlow` (se sigue usando solo para invitaciones especiales y eventos sin áreas). `useEventDetailState.ts` deja de forzar la apertura del modal de pago tras seleccionar tier/área.
- Sin cambios en la lógica de pago, holds, polling de Qhantuy, ni en las funciones edge.

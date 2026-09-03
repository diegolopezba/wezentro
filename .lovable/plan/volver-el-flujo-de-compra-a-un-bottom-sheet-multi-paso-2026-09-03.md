# Volver el flujo de compra a un bottom sheet multi-paso

## Qué cambia

El flujo de compra a pantalla completa vuelve a ser un único bottom sheet claro (light theme), con varias vistas internas:

1. Vista 1 — Elegir qué comprar: entradas (tiers) y lounges/áreas juntos, con mapa visual y lista, igual que hoy.
2. Vista 2 — Tus datos: cantidad de personas, info del área (descripción, perks, entradas incluidas) y preguntas del organizador.
3. Botón "Continuar" avanza dentro del mismo sheet; la flecha de atrás vuelve a la vista anterior sin cerrar el sheet.

## Comportamiento del sheet

- Altura fija de 2/3 de la pantalla en móvil (67dvh) en todas las vistas, para que no "salte" al cambiar de paso.
- Estructura: header fijo arriba (título + volver/cerrar), contenido central scrolleable, footer fijo con el botón de acción.
- El contenido interno hace scroll para ver toda la info extra (perks, notas, preguntas).
- Tema claro consistente con el resto de los bottom sheets de la app.

## Detalles técnicos

- Reescribir `src/components/events/PurchaseFlow.tsx`: reemplazar el portal fullscreen (`createPortal` + `m.div fixed inset-0`) por `Sheet`/`SheetContent` de `@/components/ui/bottom-sheet` con `side="bottom"`, clases `light-sheet rounded-t-3xl`, `h-[67dvh]` y layout `flex flex-col`.
- Mantener el estado interno de pasos (`step: "select" | "details"`) y toda la lógica actual: disponibilidad de áreas, tiers, `holdEventArea`, `saveAreaBookingAnswers`, validación de preguntas obligatorias, callbacks `onSelectTier` y `onAreaHeld`.
- Marcar el área scrolleable con `overflow-y-auto` y `data-vaul-no-drag` para que el scroll no arrastre el sheet.
- Quitar el bloqueo manual de `document.body.style.overflow` (lo maneja el componente Sheet).
- Sin cambios en `EventDetail.tsx` ni `EventDetailModal.tsx` (misma API de props).

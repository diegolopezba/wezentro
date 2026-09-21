# Igualar “Editar área” a un bottom sheet de dos tercios

## Cambio

En `src/components/venue/AreaEditSheet.tsx`:

- Reemplazar el límite `max-h-[70dvh]` por una altura fija de `h-[67dvh]`, equivalente a dos tercios de la pantalla.
- Mantener el panel como columna flexible con `flex flex-col overflow-hidden` para que esa altura no aumente por el formulario.
- Mantener arriba la barrita y el título como zona de arrastre visible.
- Mantener el formulario en su área interna scrolleable con `data-vaul-no-drag`.
- Mantener Guardar, Duplicar y Eliminar fijos abajo y accesibles.

Esto aplicará tanto al panel abierto desde **“+ Añadir área”** como al de editar una existente, porque ambos usan el mismo componente. No se cambiará ningún otro bottom sheet ni la lógica de áreas.

## Nota sobre el flujo de pago

El flujo de pago actual usa la misma estructura de altura fija y contenido interno scrolleable, aunque su valor en el código es `85dvh`. Para cumplir el resultado solicitado de dos tercios, “Editar área” usará explícitamente `67dvh` sin modificar el pago.

## Verificación

- Abrir **“+ Añadir área”** en un teléfono y confirmar que el panel ocupa aproximadamente dos tercios de la pantalla.
- Confirmar que queda cerca de un tercio de la pantalla visible arriba.
- Confirmar que el formulario scrollea sin mover ni cerrar el panel.
- Confirmar que arrastrar desde la barrita o el título cierra el panel.
- Ejecutar la comprobación de tipos.

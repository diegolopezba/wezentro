# Ajustar definitivamente la altura de “Editar área”

## Diagnóstico confirmado

El botón **“Añadir área”** abre el mismo componente `AreaEditSheet` usado para editar áreas existentes. El cambio anterior sí está aplicado, pero el límite actual de `80dvh` todavía ocupa demasiado espacio en teléfonos pequeños y deja la barrita cerca de la parte superior.

## Cambio

En `src/components/venue/AreaEditSheet.tsx`:

- Reducir la altura máxima del panel de `80dvh` a `70dvh`, dejando aproximadamente el 30% de la pantalla visible arriba.
- Mantener el encabezado y la barrita fuera de la zona `data-vaul-no-drag`, para que continúen cerrando el panel al arrastrar hacia abajo.
- Dar al encabezado una zona táctil vertical un poco más cómoda, sin modificar el contenido del formulario.
- Mantener el cuerpo scrolleable y los botones Guardar, Duplicar y Eliminar fijos y accesibles.

No se modificará ningún otro panel ni la lógica de creación, edición o guardado de áreas.

## Verificación

- Comprobar en móvil que tanto **Añadir área** como editar un área existente abren el panel con una franja amplia y visible arriba.
- Confirmar que el formulario sigue desplazándose independientemente.
- Confirmar que arrastrar desde la barrita o el título cierra el panel.
- Ejecutar la comprobación de tipos.
